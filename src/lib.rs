use wasm_bindgen::prelude::*;
use std::str;

mod nvglparser;
use nvglparser::*;

fn _debug(text: String) {
    web_sys::console::log_1(&JsValue::from(text));
}


#[wasm_bindgen(js_name=ParseNVGL)]
pub fn export_parse(input: &str) -> JsValue {
    return JsValue::from(&parseNVGL(input));
}