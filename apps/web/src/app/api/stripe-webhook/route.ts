import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

// Use service role for webhook operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('No Stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('Received Stripe webhook:', event.type)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer
        const supabaseUserId = subscription.metadata?.supabase_user_id

        if (!supabaseUserId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        // Determine plan based on subscription status and price
        let plan = 'free'
        if (subscription.status === 'active') {
          // You can check the price ID or product to determine the plan
          plan = 'pro'
        }

        // Update user profile
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            plan,
            updated_at: new Date().toISOString()
          })
          .eq('id', supabaseUserId)

        if (error) {
          console.error('Error updating profile:', error)
        } else {
          console.log(`Updated user ${supabaseUserId} to plan: ${plan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const supabaseUserId = subscription.metadata?.supabase_user_id

        if (!supabaseUserId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        // Downgrade to free plan
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            plan: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', supabaseUserId)

        if (error) {
          console.error('Error downgrading profile:', error)
        } else {
          console.log(`Downgraded user ${supabaseUserId} to free plan`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        console.log(`Payment succeeded for invoice: ${invoice.id}`)
        // You can add logic here to track successful payments
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log(`Payment failed for invoice: ${invoice.id}`)
        // You can add logic here to handle failed payments
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}