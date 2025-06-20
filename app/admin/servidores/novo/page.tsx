import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ServidoresForm } from "@/components/servidores-form"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NovoServidorPage() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header com voltar */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/servidores">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Novo Servidor</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle>Adicionar Servidor</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ServidoresForm />
        </CardContent>
      </Card>
    </div>
  )
} 