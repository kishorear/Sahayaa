import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AIProviderSettings from "@/components/admin/AIProviderSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Bot, BrainCircuit, Sliders, Terminal } from "lucide-react";

export default function AISettingsPage() {
  const { toast } = useToast();
  
  const handleResetAISettings = () => {
    toast({
      title: "AI settings reset",
      description: "All AI settings have been reset to their default values."
    });
  };

  return (
    <AdminLayout>
      <Tabs defaultValue="providers" className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Settings</h1>
            <p className="text-muted-foreground">
              Configure AI models, behavior, and automation settings
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="providers">
              <Bot className="mr-2 h-4 w-4" />
              Providers
            </TabsTrigger>
            <TabsTrigger value="behavior">
              <BrainCircuit className="mr-2 h-4 w-4" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Terminal className="mr-2 h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="providers" className="space-y-6">
          <AIProviderSettings />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Behavior Settings</CardTitle>
              <CardDescription>
                Configure how the AI responds to and handles customer inquiries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Response Settings</h3>
                <div className="grid gap-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="auto-respond" className="flex flex-col space-y-1">
                      <span>Automatic Responses</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Allow AI to automatically respond to new tickets
                      </span>
                    </Label>
                    <Switch id="auto-respond" defaultChecked />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label htmlFor="response-creativity">Response Creativity</Label>
                      <span className="text-sm text-muted-foreground">Balanced</span>
                    </div>
                    <Slider
                      id="response-creativity"
                      defaultValue={[50]}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label htmlFor="response-length">Response Length</Label>
                      <span className="text-sm text-muted-foreground">Medium</span>
                    </div>
                    <Slider
                      id="response-length"
                      defaultValue={[50]}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Concise</span>
                      <span>Detailed</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Ticket Resolution</h3>
                <div className="grid gap-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="auto-resolve" className="flex flex-col space-y-1">
                      <span>Auto-Resolution</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Allow AI to automatically resolve simple tickets
                      </span>
                    </Label>
                    <Switch id="auto-resolve" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="wait-confirmation" className="flex flex-col space-y-1">
                      <span>Wait for Confirmation</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Ask user to confirm before resolving tickets
                      </span>
                    </Label>
                    <Switch id="wait-confirmation" defaultChecked />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label htmlFor="auto-resolve-confidence">Auto-Resolve Confidence Threshold</Label>
                      <span className="text-sm text-muted-foreground">High (80%)</span>
                    </div>
                    <Slider
                      id="auto-resolve-confidence"
                      defaultValue={[80]}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Integration</CardTitle>
              <CardDescription>
                Configure how the AI uses knowledge sources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="use-knowledge-base" className="flex flex-col space-y-1">
                  <span>Use Knowledge Base</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Enhance responses with data from knowledge sources
                  </span>
                </Label>
                <Switch id="use-knowledge-base" defaultChecked />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="citations" className="flex flex-col space-y-1">
                  <span>Include Citations</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Add references to knowledge sources in responses
                  </span>
                </Label>
                <Switch id="citations" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="knowledge-weight">Knowledge Weight</Label>
                  <span className="text-sm text-muted-foreground">Balanced</span>
                </div>
                <Slider
                  id="knowledge-weight"
                  defaultValue={[60]}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>AI Knowledge</span>
                  <span>Custom Knowledge</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced AI Settings</CardTitle>
              <CardDescription>
                Fine-tune technical AI parameters and system behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-muted-foreground font-medium">
                    These settings are for advanced users and may affect system performance.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="temperature">Temperature</Label>
                    <span className="text-sm text-muted-foreground">0.7</span>
                  </div>
                  <Slider
                    id="temperature"
                    defaultValue={[70]}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Deterministic (0.0)</span>
                    <span>Random (1.0)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <span className="text-sm text-muted-foreground">1024</span>
                  </div>
                  <Slider
                    id="max-tokens"
                    defaultValue={[1024]}
                    min={256}
                    max={8192}
                    step={256}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>256</span>
                    <span>8192</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="top-p">Top P</Label>
                    <span className="text-sm text-muted-foreground">0.95</span>
                  </div>
                  <Slider
                    id="top-p"
                    defaultValue={[95]}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Focused (0.5)</span>
                    <span>Diverse (1.0)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="frequency-penalty">Frequency Penalty</Label>
                    <span className="text-sm text-muted-foreground">0.0</span>
                  </div>
                  <Slider
                    id="frequency-penalty"
                    defaultValue={[0]}
                    min={-100}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Repetitive (-1.0)</span>
                    <span>Varied (1.0)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label htmlFor="presence-penalty">Presence Penalty</Label>
                    <span className="text-sm text-muted-foreground">0.0</span>
                  </div>
                  <Slider
                    id="presence-penalty"
                    defaultValue={[0]}
                    min={-100}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Stay on Topic (-1.0)</span>
                    <span>Explore New Topics (1.0)</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Settings</h3>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="ai-logging" className="flex flex-col space-y-1">
                    <span>AI Interaction Logging</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Log all AI interactions for analysis and improvement
                    </span>
                  </Label>
                  <Switch id="ai-logging" defaultChecked />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="fallback" className="flex flex-col space-y-1">
                    <span>Provider Fallback</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Automatically try alternative providers if primary fails
                    </span>
                  </Label>
                  <Switch id="fallback" defaultChecked />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="debug-mode" className="flex flex-col space-y-1">
                    <span>Debug Mode</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Show detailed AI information in responses (admin only)
                    </span>
                  </Label>
                  <Switch id="debug-mode" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button variant="outline" onClick={handleResetAISettings}>
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}