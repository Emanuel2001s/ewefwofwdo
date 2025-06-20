"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Settings, Upload, User, Monitor, Save, Eye, EyeOff } from "lucide-react"

interface Configuracao {
  id: number
  chave: string
  valor: string
  descricao: string
}

export default function ConfiguracoesPage() {
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  // Estados para formulários
  const [nomeSistema, setNomeSistema] = useState("")
  const [adminNome, setAdminNome] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [faviconUrl, setFaviconUrl] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  // Carregar configurações
  useEffect(() => {
    fetchConfiguracoes()
  }, [])

  const fetchConfiguracoes = async () => {
    try {
      const response = await fetch('/api/configuracoes?admin=true')
      if (response.ok) {
        const data = await response.json()
        setConfiguracoes(data)
        
        // Preencher formulários
        data.forEach((config: Configuracao) => {
          switch (config.chave) {
            case 'nome_sistema':
              setNomeSistema(config.valor)
              break
            case 'admin_nome':
              setAdminNome(config.valor)
              break

            case 'favicon_url':
              setFaviconUrl(config.valor)
              break
            case 'logo_url':
              setLogoUrl(config.valor)
              break
          }
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSystemConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configuracoes: [
            { chave: 'nome_sistema', valor: nomeSistema },
            { chave: 'admin_nome', valor: adminNome }
          ]
        })
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações do sistema salvas com sucesso",
        })
        // Recarregar página para aplicar mudanças
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error('Erro ao salvar')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast({
        title: "Erro",
        description: "Senha atual é obrigatória",
        variant: "destructive"
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Primeiro, verificar se a senha atual está correta
      const verifyResponse = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: currentPassword
        })
      })

      const verifyResult = await verifyResponse.json()

      if (!verifyResponse.ok) {
        throw new Error(verifyResult.error || 'Erro ao verificar senha atual')
      }

      if (!verifyResult.valid) {
        toast({
          title: "Erro",
          description: "Senha atual incorreta",
          variant: "destructive"
        })
        return
      }

      // Se a senha atual estiver correta, proceder com a alteração
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configuracoes: [
            { chave: 'admin_password', valor: newPassword }
          ]
        })
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Senha alterada com sucesso",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        throw new Error('Erro ao alterar senha')
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao alterar senha",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File, tipo: 'favicon' | 'logo') => {
    setUploading(tipo)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tipo', tipo)

      const response = await fetch('/api/configuracoes/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Sucesso",
          description: data.message,
        })
        
        // Atualizar URL no estado
        if (tipo === 'favicon') {
          setFaviconUrl(data.url)
        } else {
          setLogoUrl(data.url)
        }
        
        // Recarregar página para aplicar mudanças
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erro no upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      toast({
        title: "Erro",
        description: `Erro ao fazer upload do ${tipo}`,
        variant: "destructive"
      })
    } finally {
      setUploading(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
      </div>

      <Tabs defaultValue="sistema" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        {/* Configurações do Sistema */}
        <TabsContent value="sistema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-sistema">Nome do Sistema</Label>
                <Input
                  id="nome-sistema"
                  value={nomeSistema}
                  onChange={(e) => setNomeSistema(e.target.value)}
                  placeholder="Dashboard IPTV"
                />
                <p className="text-sm text-gray-500">
                  Este nome aparecerá em todas as páginas do sistema
                </p>
              </div>

              <Button 
                onClick={handleSaveSystemConfig}
                disabled={saving}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações de Aparência */}
        <TabsContent value="aparencia" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Favicon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Favicon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {faviconUrl ? (
                      <img 
                        src={faviconUrl} 
                        alt="Favicon" 
                        className="w-8 h-8"
                      />
                    ) : (
                      <Upload className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="favicon-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {uploading === 'favicon' ? 'Enviando...' : 'Clique para enviar favicon'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, ICO até 1MB
                        </p>
                      </div>
                      <Input
                        id="favicon-upload"
                        type="file"
                        accept=".ico,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, 'favicon')
                        }}
                        disabled={uploading === 'favicon'}
                      />
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <Upload className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {uploading === 'logo' ? 'Enviando...' : 'Clique para enviar logo'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, SVG até 2MB
                        </p>
                      </div>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, 'logo')
                        }}
                        disabled={uploading === 'logo'}
                      />
                    </Label>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  A logo aparecerá apenas na página de login
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configurações do Admin */}
        <TabsContent value="admin" className="space-y-4">


          <div className="grid gap-4 md:grid-cols-2">
            {/* Dados do Admin Supremo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Admin Supremo (ID: 1)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-nome">Nome</Label>
                  <Input
                    id="admin-nome"
                    value={adminNome}
                    onChange={(e) => setAdminNome(e.target.value)}
                    placeholder="Nome do administrador"
                  />
                </div>



                <Button 
                  onClick={handleSaveSystemConfig}
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Dados'}
                </Button>
              </CardContent>
            </Card>

            {/* Alterar Senha */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Senha atual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar nova senha"
                  />
                </div>

                <Button 
                  onClick={handlePasswordChange}
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Alterar Senha'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 