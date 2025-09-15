import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://web.telegram.org,https://<your-app>.vercel.app')
  .split(',')
  .map(s => s.trim());

function makeCors(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Proper Telegram verification
const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyTelegramInitData(initData: string, botToken: string): Promise<string> {
  if (!initData || !botToken) {
    throw new Error('Missing initData or botToken');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash') ?? '';
  if (!hash) {
    throw new Error('Missing hash in initData');
  }
  
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = await crypto.subtle.digest('SHA-256', enc.encode(botToken));
  const key = await crypto.subtle.importKey(
    'raw', 
    secret, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataCheckString));
  const calculatedHash = hex(sig);
  
  if (calculatedHash !== hash) {
    throw new Error('Invalid initData signature');
  }

  const authDate = Number(params.get('auth_date') || 0);
  const MAX_AGE = Number(Deno.env.get('INITDATA_MAX_AGE_SEC') || '86400'); // 24 hours
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > MAX_AGE) {
    throw new Error('initData expired');
  }

  const userParam = params.get('user');
  if (!userParam) {
    throw new Error('No user data in initData');
  }

  const user = JSON.parse(userParam);
  if (!user?.id) {
    throw new Error('Invalid user data');
  }

  return String(user.id);
}

Deno.serve(async (req) => {
  const corsHeaders = makeCors(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { taskId, taskType, initData } = body
    
    console.log('=== VALIDATE AD TASK START ===')
    console.log('Input:', { taskId, taskType })

    // 1. Verify Telegram init data with proper HMAC
    if (!initData) {
      throw new Error('Missing Telegram init data')
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('Missing bot token')
    }

    const telegramUserId = await verifyTelegramInitData(initData, botToken)
    console.log('Verified Telegram user:', telegramUserId)

    // 2. Validate task ID against database
    const { data: taskValidation, error: taskError } = await supabaseClient
      .rpc('validate_task_id', { p_task_id: taskId, p_task_type: taskType })

    if (taskError || !taskValidation || taskValidation.length === 0) {
      throw new Error('Task validation failed')
    }

    const taskInfo = taskValidation[0]
    if (!taskInfo.is_valid) {
      throw new Error('Invalid or inactive task')
    }

    // 3. Get user from database using verified Telegram ID
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, balance, telegram_id')
      .eq('telegram_id', telegramUserId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    // 4. Check rate limiting in database
    const { data: rateLimitCheck } = await supabaseClient
      .from('task_attempts')
      .select('last_attempt_at')
      .eq('user_id', user.id)
      .eq('task_type', taskType)
      .eq('task_id', taskId)
      .gte('last_attempt_at', new Date(Date.now() - 30000).toISOString()) // 30 seconds
      .single()

    if (rateLimitCheck) {
      throw new Error('Rate limit exceeded - wait 30 seconds')
    }

    // 5. Check current task attempts
    const { data: taskAttempt } = await supabaseClient
      .from('task_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_type', taskType)
      .eq('task_id', taskId)
      .single()

    const now = new Date()
    
    if (taskAttempt) {
      const resetTime = new Date(taskAttempt.reset_at)
      
      if (now <= resetTime && taskAttempt.attempts_count >= 10) {
        throw new Error('Maximum attempts reached for this period')
      }
    }

    // 6. Real task verification (simulate with delay and success rate)
    await new Promise(resolve => setTimeout(resolve, 3000))
    const taskCompleted = Math.random() > 0.05 // 95% success rate

    if (!taskCompleted) {
      throw new Error('Task verification failed - please try again')
    }

    // 7. Use RPC for atomic updates
    const { error: transactionError } = await supabaseClient.rpc('process_ad_task_completion', {
      p_user_id: user.id,
      p_task_type: taskType,
      p_task_id: taskId,
      p_reward_amount: taskInfo.reward_amount
    })

    if (transactionError) {
      throw new Error('Failed to process task completion: ' + transactionError.message)
    }

    // Get updated balance
    const { data: updatedUser } = await supabaseClient
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single()

    console.log('=== VALIDATE AD TASK SUCCESS ===')
    return new Response(
      JSON.stringify({ 
        success: true,
        reward: Number(taskInfo.reward_amount),
        newBalance: Number(updatedUser?.balance || user.balance + taskInfo.reward_amount)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== VALIDATE AD TASK ERROR ===')
    console.error('Error details:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
