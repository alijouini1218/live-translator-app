import { createClient } from '@/lib/supabase/server'
import { Button } from '@live-translator/ui'
import { CheckoutButton } from '@/components/billing/checkout-button'
import { CustomerPortalButton } from '@/components/billing/customer-portal-button'

// Price IDs from Stripe (these should match your actual Stripe price IDs)
const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_1234567890', // Replace with actual price ID
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_0987654321', // Replace with actual price ID
}

export default async function BillingPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() : { data: null }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Billing & Plans</h2>
        <p className="mt-2 text-gray-600">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 capitalize">
                {(profile as any)?.plan || 'Free'} Plan
              </h4>
              <p className="text-sm text-gray-500">
                {(profile as any)?.plan === 'pro' 
                  ? 'Unlimited translations with premium features'
                  : 'Up to 10 minutes per day'
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {(profile as any)?.plan === 'pro' ? '$19.99' : 'Free'}
              </p>
              {(profile as any)?.plan === 'pro' && (
                <p className="text-sm text-gray-500">per month</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <div className="bg-white rounded-lg shadow border-2 border-gray-200">
          <div className="px-6 py-8">
            <h3 className="text-2xl font-bold text-gray-900">Free</h3>
            <p className="mt-2 text-gray-500">Perfect for trying out Live Translator</p>
            <p className="mt-4">
              <span className="text-4xl font-bold text-gray-900">$0</span>
              <span className="text-gray-500">/month</span>
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Up to 10 minutes per day
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Basic language pairs
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Standard voice quality
              </li>
            </ul>
            {(profile as any)?.plan === 'free' ? (
              <Button disabled className="w-full mt-8">
                Current Plan
              </Button>
            ) : (
              <Button variant="outline" className="w-full mt-8">
                Downgrade
              </Button>
            )}
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-white rounded-lg shadow border-2 border-black">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Pro</h3>
              <span className="px-3 py-1 text-xs font-semibold text-white bg-black rounded-full">
                POPULAR
              </span>
            </div>
            <p className="mt-2 text-gray-500">For professional users</p>
            <p className="mt-4">
              <span className="text-4xl font-bold text-gray-900">$19.99</span>
              <span className="text-gray-500">/month</span>
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited translation time
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                All language pairs
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Premium voice quality
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Session history & export
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Priority support
              </li>
            </ul>
            {(profile as any)?.plan === 'pro' ? (
              <Button disabled className="w-full mt-8">
                Current Plan
              </Button>
            ) : (
              <CheckoutButton 
                priceId={PRICE_IDS.PRO_MONTHLY}
                disabled={false}
              />
            )}
          </div>
        </div>
      </div>

      {(profile as any)?.plan === 'pro' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Manage Subscription</h3>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 mb-4">
              Access your Stripe Customer Portal to manage your billing information, 
              download invoices, and update payment methods.
            </p>
            <CustomerPortalButton />
          </div>
        </div>
      )}
    </div>
  )
}