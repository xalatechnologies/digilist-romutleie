
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Sparkles, Brain } from 'lucide-react';
import { Card, Text, Badge, Stack, Button } from './XalaUI';
import { analyzePlatformData } from '../services/geminiService';

const MOCK_DATA = [
  { month: 'Jan', revenue: 45000, users: 1200 },
  { month: 'Feb', revenue: 52000, users: 1450 },
  { month: 'Mar', revenue: 48000, users: 1500 },
  { month: 'Apr', revenue: 61000, users: 1800 },
  { month: 'May', revenue: 55000, users: 1900 },
  { month: 'Jun', revenue: 67000, users: 2100 },
];

const TENANTS = [
  { name: 'Acme Corp', status: 'active', plan: 'Enterprise', users: 850, revenue: 12500 },
  { name: 'Global Tech', status: 'active', plan: 'Pro', users: 420, revenue: 4800 },
  { name: 'Startup Inc', status: 'pending', plan: 'Free', users: 50, revenue: 0 },
  { name: 'Retail Hub', status: 'active', plan: 'Pro', users: 310, revenue: 3900 },
];

export const Dashboard: React.FC = () => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzePlatformData({ performance: MOCK_DATA, tenants: TENANTS });
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Stack spacing={1}>
          <Text size="2xl" weight="bold">Platform Overview</Text>
          <Text muted>Tracking performance across 24 active tenants.</Text>
        </Stack>
        <Button 
          variant="outline" 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
        >
          {isAnalyzing ? (
            <Activity className="animate-spin mr-2 h-4 w-4" />
          ) : (
            <Brain className="mr-2 h-4 w-4" />
          )}
          AI Insights
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: '$248,500', trend: '+12.5%', icon: <DollarSign className="text-blue-500" /> },
          { label: 'Active Users', value: '14,200', trend: '+5.2%', icon: <Users className="text-indigo-500" /> },
          { label: 'Avg. Churn', value: '1.4%', trend: '-0.2%', icon: <TrendingUp className="text-green-500" /> },
          { label: 'System Uptime', value: '99.98%', trend: 'Stable', icon: <Activity className="text-orange-500" /> },
        ].map((metric) => (
          <Card key={metric.label} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-muted rounded-md">{metric.icon}</div>
              <Badge variant={metric.trend.includes('+') ? 'success' : 'secondary'}>{metric.trend}</Badge>
            </div>
            <Text muted size="sm">{metric.label}</Text>
            <Text size="2xl" weight="bold">{metric.value}</Text>
          </Card>
        ))}
      </div>

      {/* AI Analysis View */}
      {analysis && (
        <Card className="p-6 border-primary/20 bg-primary/5 overflow-hidden relative">
           <div className="absolute top-0 right-0 p-4">
             <Sparkles className="text-primary/40 h-12 w-12" />
           </div>
           <Stack spacing={4}>
             <div className="flex items-center gap-2">
               <Brain className="text-primary" />
               <Text weight="bold" size="lg" className="text-primary">Xala AI Strategic Analysis</Text>
             </div>
             <Text className="leading-relaxed">{analysis.summary}</Text>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
               {analysis.insights.map((insight: any, i: number) => (
                 <div key={i} className="p-4 bg-card rounded-md border border-primary/10 shadow-sm">
                   <Badge className="mb-2" variant={insight.priority === 'High' ? 'destructive' : 'default'}>
                     {insight.priority}
                   </Badge>
                   <Text weight="semibold" className="mb-1">{insight.title}</Text>
                   <Text size="sm" muted>{insight.description}</Text>
                 </div>
               ))}
             </div>
           </Stack>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <Text weight="semibold" className="mb-6">Revenue Growth</Text>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <Text weight="semibold" className="mb-6">User Adoption</Text>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Tenants Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <Text weight="semibold">Top Tenants</Text>
          <Button variant="ghost" size="sm">View All</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">ARR</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {TENANTS.map((tenant) => (
                <tr key={tenant.name} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{tenant.name}</td>
                  <td className="px-6 py-4 text-sm">{tenant.plan}</td>
                  <td className="px-6 py-4">
                    <Badge variant={tenant.status === 'active' ? 'success' : 'secondary'}>
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{tenant.users}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-right">${tenant.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
