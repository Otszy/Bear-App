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
    const { amount, method, accountInfo, initData } = body

    // 1. Verify Telegram init data with proper HMAC
    if (!initData) {
      throw new Error('Missing Telegram init data')
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('Missing bot token')
    }

    const telegramUserId = await verifyTelegramInitData(initData, botToken)

    // 2. Validate inputs
    if (!amount || !method || !accountInfo) {
      throw new Error('Missing required fields')
    }

    const withdrawAmount = parseFloat(amount)
    if (isNaN(withdrawAmount) || withdrawAmount <= 0 || withdrawAmount < 0.01) {
      throw new Error('Invalid withdrawal amount (minimum $0.01)')
    }

    if (withdrawAmount > 100) {
      throw new Error('Maximum withdrawal amount is $100')
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

    if (user.balance < withdrawAmount) {
      throw new Error('Insufficient balance')
    }

    // 4. Database-based rate limiting (5 minutes)
    const { data: rateLimitCheck } = await supabaseClient
      .from('withdrawals')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 300000).toISOString()) // 5 minutes
      .single()

    if (rateLimitCheck) {
      throw new Error('Rate limit exceeded. Please wait 5 minutes between withdrawals.')
    }

    // 5. Database-based idempotency check (1 minute window)
    const idempotencyWindow = new Date(Date.now() - 60000).toISOString()
    const { data: duplicateCheck } = await supabaseClient
      .from('withdrawals')
      .select('id')
      .eq('user_id', user.id)
      .eq('amount', withdrawAmount)
      .eq('method', method)
      .eq('account_info', accountInfo)
      .gte('created_at', idempotencyWindow)
      .single()

    if (duplicateCheck) {
      throw new Error('Duplicate withdrawal request detected')
    }

    // 6. Check daily withdrawal limit
    const today = new Date().toISOString().split('T')[0]
    const { data: todayWithdrawals } = await supabaseClient
      .from('withdrawals')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z')

    const todayTotal = todayWithdrawals?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0
    if (todayTotal + withdrawAmount > 100) {
      throw new Error('Daily withdrawal limit exceeded ($100)')
    }

    // 7. Create withdrawal record first
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount: withdrawAmount,
        method: method,
        account_info: accountInfo,
        status: 'pending'
      })
      .select()
      .single()

    if (withdrawalError) throw withdrawalError

    // 8. Deduct amount from user balance with optimistic locking
    const { error: balanceError } = await supabaseClient
      .from('users')
      .update({ 
        balance: user.balance - withdrawAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .eq('balance', user.balance) // Optimistic locking

    if (balanceError) {
      // Rollback withdrawal record
      await supabaseClient
        .from('withdrawals')
        .delete()
        .eq('id', withdrawal.id)
      
      throw new Error('Failed to process withdrawal: ' + balanceError.message)
    }

    console.log(`Withdrawal request: $${withdrawAmount} via ${method} to ${accountInfo}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        withdrawalId: withdrawal.id,
        newBalance: user.balance - withdrawAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Withdrawal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
