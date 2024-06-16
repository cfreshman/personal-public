import React from "react";
import { props } from "src/lib/types";


export const Row = (props:props) => <div {...props} className={`${props.className??''} row`}>{props.children}</div>
export const Column = (props:props) => <div {...props} className={`${props.className??''} column`}>{props.children}</div>

export const row = (elements) => <Row>{elements.map((e, i) => {
    if (e.key === undefined) e.key = i
    return e
})}</Row>
export const column = (elements) => <Column>{elements.map((e, i) => {
    if (e.key === undefined) e.key = i
    return e
})}</Column>
