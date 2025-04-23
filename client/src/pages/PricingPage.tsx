import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  action: string;
}

const plans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$49",
    description: "Perfect for small businesses getting started with AI support.",
    features: [
      "AI chatbot for website",
      "Basic ticket routing",
      "Email integration",
      "5,000 AI messages per month",
      "3 team members",
      "Basic analytics",
      "Standard support",
    ],
    action: "Get Started"
  },
  {
    name: "Professional",
    price: "$149",
    description: "Ideal for growing businesses needing advanced support automation.",
    features: [
      "Everything in Starter",
      "Advanced ticket routing",
      "Custom knowledge sources",
      "Unlimited AI messages",
      "10 team members",
      "Advanced analytics",
      "Priority support",
      "White-labeled chat widget",
      "API access"
    ],
    highlighted: true,
    action: "Go Professional"
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For organizations with complex support needs and high volume.",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Dedicated account manager",
      "Custom AI training",
      "SSO & advanced security",
      "On-premise deployment option",
      "SLA guarantees",
      "24/7 premium support",
      "Custom integrations"
    ],
    action: "Contact Sales"
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <img src="/logo.svg" alt="SAHAYAA.AI Logo" className="w-8 h-8" />
                <span className="ml-2 text-xl font-bold">SAHAYAA.AI</span>
              </div>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/pricing">
                <span className="text-primary font-medium transition-colors cursor-pointer">Pricing</span>
              </Link>
              <Link href="/how-it-works">
                <span className="hover:text-primary transition-colors cursor-pointer">How It Works</span>
              </Link>
              <Link href="/contact">
                <span className="hover:text-primary transition-colors cursor-pointer">Contact Us</span>
              </Link>
              <Link href="/auth">
                <Button size="sm">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Pricing Header */}
      <div className="bg-gradient-to-b from-primary/10 to-white dark:from-primary/20 dark:to-gray-900 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Choose the plan that best fits your needs. All plans include our core AI support features.
          </p>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg dark:border-primary' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold py-1 px-3 rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-lg">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-gray-500 dark:text-gray-400"> / month</span>}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/auth">
                    <Button 
                      className={`w-full ${plan.highlighted ? 'bg-primary hover:bg-primary/90' : ''}`}
                    >
                      {plan.action}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Enterprise Custom Solution */}
          <div className="mt-20 bg-gray-50 dark:bg-gray-800 rounded-lg p-8 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h2 className="text-2xl font-bold mb-4">Need a custom solution?</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  We offer tailored solutions for enterprises with specific requirements.
                  Our team will work with you to create a custom plan that meets your needs.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Custom AI training on your product documentation</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Integration with your existing tools and workflows</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>Dedicated support and implementation team</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/3 text-center">
                <Button size="lg" className="w-full">
                  Contact Sales
                </Button>
                <p className="text-sm mt-3 text-gray-500 dark:text-gray-400">
                  Get a response within 24 hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-bold mb-2">How does the AI chatbot work?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our AI chatbot uses advanced natural language processing to understand customer inquiries,
                automatically route them to the right department, and resolve simple issues without human intervention.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Can I customize the chatbot's appearance?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, all plans allow basic customization. The Professional and Enterprise plans offer full white-labeling
                and branding options to match your website's look and feel.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">How do I integrate with my existing systems?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We offer API access in the Professional plan and custom integrations in the Enterprise plan.
                Common integrations include Zendesk, Salesforce, Jira, and Slack.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">What happens if I exceed my message limit?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                For the Starter plan, additional messages are billed at $0.01 per message.
                The Professional and Enterprise plans include unlimited messages.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Can I switch plans later?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, you can upgrade or downgrade your plan at any time. When upgrading,
                the new features are available immediately. When downgrading, changes take effect at the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Do you offer a free trial?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, we offer a 14-day free trial of the Professional plan with no credit card required.
                You can downgrade to the free plan or upgrade to continue after the trial.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your customer support?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get started today with a 14-day free trial. No credit card required.
          </p>
          <Link href="/auth">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
            >
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center">
                <img src="/logo.svg" alt="SAHAYAA.AI Logo" className="w-8 h-8" />
                <span className="ml-2 text-xl font-bold text-white">SAHAYAA.AI</span>
              </div>
              <p className="mt-2 text-sm">AI-powered customer support solution</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/pricing">
                <span className="hover:text-white transition-colors cursor-pointer">Pricing</span>
              </Link>
              <Link href="/how-it-works">
                <span className="hover:text-white transition-colors cursor-pointer">How It Works</span>
              </Link>
              <Link href="/auth">
                <span className="hover:text-white transition-colors cursor-pointer">Login</span>
              </Link>
              <Link href="/docs">
                <span className="hover:text-white transition-colors cursor-pointer">Documentation</span>
              </Link>
              <Link href="/api">
                <span className="hover:text-white transition-colors cursor-pointer">API</span>
              </Link>
              <Link href="/contact">
                <span className="hover:text-white transition-colors cursor-pointer">Contact Us</span>
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} SAHAYAA.AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}