import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: {
    id: number
    type: string
  }
  date: number
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

Deno.serve(async (req) => {
  console.log('=== TELEGRAM WEBHOOK START ===')
  console.log('Method:', req.method)
  console.log('Headers:', {
    'content-type': req.headers.get('content-type'),
    'content-length': req.headers.get('content-length'),
    'x-telegram-bot-api-secret-token': req.headers.get('x-telegram-bot-api-secret-token') ? 'present' : 'missing'
  })

  // Verify webhook secret token
  const SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || 'tgWebhook_Andre_2025'
  console.log('Webhook secret configured:', !!SECRET)
  
  if (SECRET) {
    const headerSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    console.log('Header secret present:', !!headerSecret)
    if (headerSecret !== SECRET) {
      console.log('Invalid webhook secret - expected vs received:', SECRET !== headerSecret)
      return new Response('Forbidden', { status: 403 })
    }
  } else {
    console.log('WARNING: No webhook secret configured - accepting all requests')
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('Non-POST request received:', req.method)
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

    console.log('Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      botToken: !!botToken
    })

    if (!supabaseUrl || !supabaseKey || !botToken) {
      throw new Error('Missing environment configuration')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Get request body with better error handling
    let bodyText = ''
    let update: TelegramUpdate

    try {
      const contentLength = req.headers.get('content-length')
      console.log('Content-Length:', contentLength)
      
      if (!contentLength || contentLength === '0') {
        console.log('Empty request body - returning OK')
        return new Response('OK')
      }

      bodyText = await req.text()
      console.log('Raw body received (length):', bodyText.length)

      if (!bodyText || bodyText.trim() === '') {
        console.log('Empty body text - returning OK')
        return new Response('OK')
      }

      update = JSON.parse(bodyText)
      console.log('Parsed update successfully - type:', update.message ? 'message' : 'other')

    } catch (parseError) {
      console.error('JSON parse error:', parseError.message)
      return new Response('OK') // Return OK to avoid retries
    }

    // Check if update has message
    if (!update || !update.message) {
      console.log('No message in update - returning OK')
      return new Response('OK')
    }

    const message = update.message
    const user = message.from
    const chatId = message.chat.id
    const text = message.text || ''

    console.log('Processing message:', { 
      chatId, 
      userId: user.id, 
      text,
      firstName: user.first_name,
      username: user.username 
    })

    // Handle /start command
    if (text.startsWith('/start')) {
      console.log('=== HANDLING /START COMMAND ===')
      const startParam = text.split(' ')[1]
      console.log('Start command with param:', startParam)

      // Check if user exists
      let { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', user.id.toString())
        .single()

      console.log('Existing user query result:', { existingUser, fetchError })

      if (!existingUser) {
        console.log('Creating new user for telegram_id:', user.id)
        
        const { data: newUser, error: createError } = await supabaseClient
          .from('users')
          .insert({
            telegram_id: user.id.toString(),
            username: user.username || null,
            first_name: user.first_name,
            last_name: user.last_name || null,
            balance: 0
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', createError)
          throw createError
        }

        existingUser = newUser
        console.log('New user created:', existingUser)

        // Handle referral if startParam exists
        if (startParam && startParam.startsWith('ref_')) {
          const referrerTelegramId = startParam.replace('ref_', '')
          console.log('Processing referral from telegram_id:', referrerTelegramId)
          
          if (referrerTelegramId !== user.id.toString()) {
            const { data: referrerUser, error: referrerError } = await supabaseClient
              .from('users')
              .select('id, balance')
              .eq('telegram_id', referrerTelegramId)
              .single()

            console.log('Referrer lookup result:', { referrerUser, referrerError })

            if (referrerUser && !referrerError) {
              console.log('Found referrer, creating referral record')
              
              const { error: referralError } = await supabaseClient
                .from('referrals')
                .insert({
                  referrer_id: referrerUser.id,
                  referred_id: existingUser.id,
                  reward_claimed: false,
                  commission_amount: 0
                })

              if (referralError) {
                console.error('Error creating referral record:', referralError)
              } else {
                await sendTelegramMessage(
                  referrerTelegramId,
                  `🎉 Great news! Someone joined using your referral link!\n💰 You'll earn 10% commission from their earnings!`
                )
              }
            }
          }
        }
      }

      // Send welcome message
      const welcomeMessage = `🐻 Welcome to BearApp!

${existingUser ? 'Welcome back!' : 'Thanks for joining us!'} 

💰 Current Balance: $${existingUser.balance.toFixed(3)}

🚀 Start earning by completing tasks and inviting friends!

Click the button below to open the app:`

      console.log('Sending welcome message to chat_id:', chatId)
      await sendTelegramMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: "🚀 Open BearApp",
              web_app: { url: "https://telegram-mini-app-wi-qg9a.bolt.host" }
            }
          ]]
        }
      })
    }

    // Handle other commands
    else if (text === '/balance') {
      console.log('=== HANDLING /BALANCE COMMAND ===')
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('balance')
        .eq('telegram_id', user.id.toString())
        .single()

      const balance = userData?.balance || 0
      const balanceMessage = `💰 Your current balance: $${balance.toFixed(3)}`
      
      await sendTelegramMessage(chatId, balanceMessage)
    }

    else if (text === '/help') {
      console.log('=== HANDLING /HELP COMMAND ===')
      const helpMessage = `🐻 BearApp Commands:

/start - Start the bot and open app
/balance - Check your balance
/help - Show this help message

💡 Use the mini app to:
• Complete advertisement tasks
• Invite friends for 10% commission
• Withdraw your earnings

Click "Open BearApp" to get started!`

      await sendTelegramMessage(chatId, helpMessage, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: "🚀 Open BearApp",
                  web_app: { url: "https://telegram-mini-app-wi-qg9a.bolt.host" }
            }
          ]]
        }
      })
    }

    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===')
    return new Response('OK')

  } catch (error) {
    console.error('=== WEBHOOK ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response('OK') // Always return OK to avoid retries
  }
})

async function sendTelegramMessage(chatId: number | string, text: string, extra?: any) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  
  console.log('=== SENDING TELEGRAM MESSAGE ===')
  console.log('Chat ID:', chatId)
  console.log('Text length:', text.length)
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    ...extra
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text()
    console.log('Telegram API response status:', response.status)
      
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set in environment')
      throw new Error('Bot token not configured')
    }

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status} - ${responseText}`)
    }

    return JSON.parse(responseText)
  } catch (error) {
    console.error('Error in sendTelegramMessage:', error)
    throw error
  }
}