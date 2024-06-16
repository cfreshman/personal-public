import { parseSubpath } from "./page";
import { absolutePath } from "./util";


export async function copy(text, display=undefined, ms=undefined, label='copied!'): Promise<boolean> {
   console.debug('COPY', text, display, ms)
   const updateDisplay = () => {
      if (display) {
         if (typeof(display) === 'string') {
            display = document.querySelector(display)
         }
         const save = display.innerHTML
         const min_width = display.getBoundingClientRect().width+'px'
         const min_width_save = display.style.minWidth
         display.style.minWidth = min_width
         display.textContent = label
         setTimeout(() => {
            display.textContent = save
            display.style.minWidth = min_width_save
         }, ms || 3000)
      }
   }
   return new Promise(resolve => {
      if (navigator.clipboard) {
         navigator.clipboard.writeText(text)
            .then(() => {
               updateDisplay()
               resolve(true)
            })
            .catch(() => resolve(false));
      } else {
         const textarea = document.createElement('textarea')
         textarea.value = text
         document.body.appendChild(textarea)
         textarea.select()
         document.execCommand('copy')
         document.body.removeChild(textarea)
         updateDisplay()
         resolve(true)
      }
   })
}

export const copyPath = path => copy(absolutePath(parseSubpath(path)))
