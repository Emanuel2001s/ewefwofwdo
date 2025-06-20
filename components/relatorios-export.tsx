"use client"

import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { useState } from "react"

interface ExportButtonsProps {
  data: any[]
  filename: string
  reportContent?: string
}

export function ExportButtons({ data, filename, reportContent }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToPDF = async () => {
    if (!data || data.length === 0) {
      alert('Nenhum dado disponível para exportação')
      return
    }

    setIsExporting(true)
    
    try {
      // Importação dinâmica para evitar problemas de SSR
      const jsPDF = (await import('jspdf')).default
      const html2canvas = (await import('html2canvas')).default

      // Criar novo PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10

      // Configurar fonte para suportar acentos
      pdf.setFont('helvetica')
      
      // Cabeçalho do relatório
      pdf.setFontSize(18)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Relatório IPTV Manager', margin, 20)
      
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      const currentDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      pdf.text(`Gerado em: ${currentDate}`, margin, 30)

      // Linha separadora
      pdf.setDrawColor(200, 200, 200)
      pdf.line(margin, 35, pageWidth - margin, 35)

      // Capturar o conteúdo específico do relatório
      const reportElement = document.querySelector('[data-report-content]') as HTMLElement
      
      if (reportElement) {
        // Capturar screenshot do conteúdo
        const canvas = await html2canvas(reportElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        })

        const imgData = canvas.toDataURL('image/png')
        const imgWidth = pageWidth - (margin * 2)
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        let heightLeft = imgHeight
        let position = 45 // Posição após cabeçalho

        // Adicionar imagem ao PDF, com quebra de página se necessário
        while (heightLeft >= 0) {
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
          heightLeft -= pageHeight - 50 // Espaço para cabeçalho/rodapé
          
          if (heightLeft > 0) {
            pdf.addPage()
            position = 10 // Reset position for new page
          }
        }
      } else {
        // Fallback: criar relatório textual simples
        let yPosition = 50
        const lineHeight = 7
        
        pdf.setFontSize(14)
        pdf.setTextColor(40, 40, 40)
        pdf.text('Resumo dos Dados:', margin, yPosition)
        yPosition += lineHeight * 2

        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)

        // Adicionar informações básicas
        if (data.length > 0) {
          const headers = Object.keys(data[0])
          
          headers.forEach((header, index) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage()
              yPosition = 20
            }
            
            pdf.text(`${header}: ${data.length} registros`, margin, yPosition)
            yPosition += lineHeight
          })
        }

        // Adicionar tabela de dados (primeiros 50 registros)
        yPosition += lineHeight
        pdf.setFontSize(8)
        
        const displayData = data.slice(0, 50) // Limitar para não sobrecarregar
        displayData.forEach((row, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage()
            yPosition = 20
          }
          
          const rowText = Object.values(row).join(' | ')
          const wrappedText = pdf.splitTextToSize(rowText, pageWidth - (margin * 2))
          pdf.text(wrappedText, margin, yPosition)
          yPosition += lineHeight * wrappedText.length
        })
      }

      // Rodapé
      const totalPages = (pdf as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(
          `Página ${i} de ${totalPages} - IPTV Manager`, 
          pageWidth - margin - 50, 
          pageHeight - 5
        )
      }

      // Salvar o PDF
      pdf.save(`${filename}.pdf`)
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
      onClick={exportToPDF}
      disabled={isExporting}
    >
      {isExporting ? (
        <>
          <FileText className="mr-2 h-4 w-4 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </>
      )}
    </Button>
  )
} 