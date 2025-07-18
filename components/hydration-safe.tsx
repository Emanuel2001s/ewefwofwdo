'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface HydrationSafeProps {
  children: ReactNode
}

export function HydrationSafe({ children }: HydrationSafeProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Remove atributos problemáticos adicionados por extensões
    const removeExtensionAttributes = () => {
      const problematicAttributes = [
        'cz-shortcut-listen',
        'data-grammarly-shadow-root',
        'data-gramm_editor',
        'data-gramm',
        'data-darkreader-inline-bgcolor',
        'data-darkreader-inline-color',
        'spellcheck'
      ]

      // Remove do body
      problematicAttributes.forEach(attr => {
        if (document.body?.hasAttribute(attr)) {
          document.body.removeAttribute(attr)
        }
      })

      // Remove do html
      problematicAttributes.forEach(attr => {
        if (document.documentElement?.hasAttribute(attr)) {
          document.documentElement.removeAttribute(attr)
        }
      })
    }

    // Executa imediatamente
    removeExtensionAttributes()

    // Executa após um delay para garantir que as extensões tenham carregado
    const timeoutId = setTimeout(removeExtensionAttributes, 100)

    // Observer para remover atributos quando eles forem adicionados
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          const target = mutation.target
          const problematicAttributes = [
            'cz-shortcut-listen',
            'data-grammarly-shadow-root',
            'data-gramm_editor',
            'data-gramm'
          ]
          
          problematicAttributes.forEach(attr => {
            if (target.hasAttribute(attr)) {
              target.removeAttribute(attr)
            }
          })
        }
      })
    })

    // Observa mudanças no documento
    observer.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: [
        'cz-shortcut-listen',
        'data-grammarly-shadow-root',
        'data-gramm_editor',
        'data-gramm'
      ]
    })

    // Marca que a hidratação foi concluída
    setIsHydrated(true)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [])

  // Renderiza os children apenas após a hidratação
  if (!isHydrated) {
    return null
  }

  return <>{children}</>
} 