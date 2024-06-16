import { props } from "src/lib/types"
import { S } from "src/lib/util"

export const Dangerous = ({html,...props}:props&{html:string}) => <div style={S(`display:flex`)} {...props} dangerouslySetInnerHTML={{ __html:html }}></div>
export const dangerous = (html, props={}) => <Dangerous html={html} {...props} />
