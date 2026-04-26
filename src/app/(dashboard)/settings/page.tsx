'use client';

import { useState, useEffect } from 'react';
import { Settings, Percent, Building2, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SaveStatus, SaveStatusType } from '@/components/ui/save-status';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('idle');

  const [settings, setSettings] = useState({
    platformCommission: 15,
    kdvRate: 10,
    bankCommissionRate: 2.5,
    stopajRate: 1,
    migrosCommission: 40,
    getirCommission: 40,
    yemeksepetiCommission: 40,
    trendyolCommission: 40,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          platformCommission: data.platformCommission ?? 15,
          kdvRate: data.kdvRate ?? 10,
          bankCommissionRate: data.bankCommissionRate ?? 2.5,
          stopajRate: data.stopajRate ?? 1,
          migrosCommission: data.migrosCommission ?? 40,
          getirCommission: data.getirCommission ?? 40,
          yemeksepetiCommission: data.yemeksepetiCommission ?? 40,
          trendyolCommission: data.trendyolCommission ?? 40,
        });
      }
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      setSaveStatus('error');
    }
  };

  const handleChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="blob blob-blue w-[300px] h-[300px] -top-20 -left-20 opacity-20" />
      <div className="blob blob-purple w-[300px] h-[300px] -bottom-20 -right-20 opacity-20" />

      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              Sistem Ayarları
            </h1>
            <p className="text-muted-foreground">
              Genel vergi oranlarını ve platform komisyonlarını yönetin.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <SaveStatus status={saveStatus} />
            <Button onClick={handleSave} disabled={saveStatus === 'saving'} className="gap-2 shadow-lg">
              {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vergiler & Kesintiler */}
          <Card className="glass-panel border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-blue-500" />
                Vergiler & Kesintiler
              </CardTitle>
              <CardDescription>
                Temel KDV, banka ve stopaj kesintilerini ayarlayın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kdvRate">KDV Oranı (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="kdvRate"
                    type="number"
                    value={settings.kdvRate}
                    onChange={(e) => handleChange('kdvRate', e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankCommissionRate">Banka Komisyonu (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="bankCommissionRate"
                    type="number"
                    value={settings.bankCommissionRate}
                    onChange={(e) => handleChange('bankCommissionRate', e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stopajRate">Stopaj Oranı (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="stopajRate"
                    type="number"
                    value={settings.stopajRate}
                    onChange={(e) => handleChange('stopajRate', e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Komisyonları */}
          <Card className="glass-panel border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                Platform Komisyonları
              </CardTitle>
              <CardDescription>
                Farklı satış platformlarının kesinti oranlarını güncelleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trendyolCommission">Trendyol Yemek (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                  <Input
                    id="trendyolCommission"
                    type="number"
                    value={settings.trendyolCommission}
                    onChange={(e) => handleChange('trendyolCommission', e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yemeksepetiCommission">Yemeksepeti (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  <Input
                    id="yemeksepetiCommission"
                    type="number"
                    value={settings.yemeksepetiCommission}
                    onChange={(e) => handleChange('yemeksepetiCommission', e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="getirCommission">Getir Yemek (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                  <Input
                    id="getirCommission"
                    type="number"
                    value={settings.getirCommission}
                    onChange={(e) => handleChange('getirCommission', e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="migrosCommission">Migros Yemek (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
                  <Input
                    id="migrosCommission"
                    type="number"
                    value={settings.migrosCommission}
                    onChange={(e) => handleChange('migrosCommission', e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
