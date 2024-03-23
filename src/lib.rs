use wasm_bindgen::prelude::*;
use std::str;

mod nvglparser;
use nvglparser::*;

fn _debug(text: String) {
    web_sys::console::log_1(&JsValue::from(text));
}

#[wasm_bindgen(js_name=Parse1)]
pub fn export_parse(input: &str) -> JsValue {
    match parser::stat(input) {
        Ok(val) =>{
            return JsValue::from(serde_json::to_string(&val).unwrap());
        }
        Err(err) =>{
            return JsValue::from(&format!("{:?}", err));
        }
    }
}

#[wasm_bindgen(js_name=Parse2)]
pub fn export_parse2(input: &str) -> JsValue {
    match parser::stat(input) {
        Ok(val) =>{
            //debug(format!("Done {:?}", val));
            return JsValue::from(&format!("{:?}", val));
        }
        Err(err) =>{
            //debug(format!("Err  {:?}", err));
            return JsValue::from(&format!("{:?}", err));
        }
    }
}