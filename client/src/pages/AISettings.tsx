import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export default function AISettings() {
  const [autoReply, setAutoReply] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: 'url(https://www.openmindt.com/wp-content/uploads/2024/12/marketingopenmind-automation-systems-linked-to-each-other-progr-ed68d0cb-ea15-4d2f-8801-f4d619eff529.png)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/95 via-[#6366F1]/90 to-[#3B82F6]/95" />
        <div className="relative p-6 text-white flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">AI Chatbot Settings</h1>
            <p className="text-white/80 mt-1">Configure AI behavior and responses</p>
          </div>
          <div 
            className="hidden md:block w-20 h-20 bg-contain bg-center bg-no-repeat opacity-60"
            style={{
              backgroundImage: 'url(https://www.openmindt.com/wp-content/uploads/2024/12/marketingopenmind-automation-systems-linked-to-each-other-progr-ed68d0cb-ea15-4d2f-8801-f4d619eff529.png)',
              filter: 'brightness(2)',
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Message</CardTitle>
            <CardDescription>First message sent to new leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcome-message">Message Template</Label>
              <Textarea
                id="welcome-message"
                placeholder="Enter welcome message..."
                rows={4}
                defaultValue="Hi {name}! Thanks for reaching out to GMD Industrial Metals. I'm your AI assistant and I'm here to help you find the perfect metal solutions for your project. How can I assist you today?"
                data-testid="input-welcome-message"
              />
            </div>
            <Button data-testid="button-save-welcome">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fallback Message</CardTitle>
            <CardDescription>Message when AI can't answer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fallback-message">Message Template</Label>
              <Textarea
                id="fallback-message"
                placeholder="Enter fallback message..."
                rows={4}
                defaultValue="I'm not sure I understand that question. Let me connect you with one of our specialists who can help you better. In the meantime, check out our latest promotions!"
                data-testid="input-fallback-message"
              />
            </div>
            <Button data-testid="button-save-fallback">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Behavior</CardTitle>
            <CardDescription>Configure how AI responds to leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Reply</Label>
                <p className="text-sm text-muted-foreground">Automatically respond to messages</p>
              </div>
              <Switch
                checked={autoReply}
                onCheckedChange={setAutoReply}
                data-testid="switch-auto-reply"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Use Knowledge Base</Label>
                <p className="text-sm text-muted-foreground">Pull answers from uploaded documents</p>
              </div>
              <Switch
                checked={useKnowledgeBase}
                onCheckedChange={setUseKnowledgeBase}
                data-testid="switch-knowledge-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-delay">Response Delay (seconds)</Label>
              <Input
                id="response-delay"
                type="number"
                defaultValue="2"
                min="0"
                max="10"
                data-testid="input-response-delay"
              />
              <p className="text-xs text-muted-foreground">Delay before AI sends response</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Settings</CardTitle>
            <CardDescription>WhatsApp API configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">WhatsApp Phone Number</Label>
              <Input
                id="phone-number"
                placeholder="+1 234 567 8900"
                defaultValue="+1 234 567 8900"
                data-testid="input-phone-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-status">API Status</Label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-3"></div>
                <span className="text-sm text-muted-foreground">Connected</span>
              </div>
            </div>
            <Button variant="outline" data-testid="button-test-connection">
              Test Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
