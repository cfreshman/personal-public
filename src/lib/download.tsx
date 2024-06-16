export async function download(href, filename, display=undefined, ms=undefined, label='downloaded!'): Promise<boolean> {
   console.debug('DOWNLOAD', href, filename, display, ms)
   const updateDisplay = () => {
      if (display) {
         const save = display.innerHTML
         display.textContent = label
         setTimeout(() =>  display.textContent = save, ms || 3000)
      }
   }
   return new Promise(resolve => {
      const link = document.createElement('a')
      link.download = filename
      link.href = href
      link.click()
      updateDisplay()
   })
}
export async function download_text(text, filename, display=undefined, ms=undefined, label='downloaded!'): Promise<boolean> {
   const href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
   return download(href, filename, display, ms, label)
}

export const dataurl_href = (string, type='text/html') => `data:${type};${{
   'text/plain': `charset=utf-8,`,
   'text/html': `charset=utf-8,`,
}[type] || ''}` + encodeURIComponent(string)
export const blob_href = (blob, type='text/html') => URL.createObjectURL(new Blob([blob], { type })).toString()
