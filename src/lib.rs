use wasm_bindgen::prelude::*;
use std::str;
use serde::Serialize;

fn _debug(text: String) {
    web_sys::console::log_1(&JsValue::from(text));
}

#[derive(Debug,Serialize)]
pub enum Node {
    // literal type
    Number(f64),
    Bool(bool),
    String(String),
    // identifier
    Var(String),
    Key(Box<Node>,String),
    // operation
    Opr(String,Box<Node>,Box<Node>),
    UOpr(String,Box<Node>),
    // expr
    Expr(Box<Node>),
    // stat
    Stat(Box<Node>,Box<Node>)
}
peg::parser! {
    grammar parser() for str {
        pub rule stat() -> Node
            = "return" _ e:expr() _ ";" { Node::Expr(Box::new(e)) }
            / e:expr() _ ";" { Node::Expr(Box::new(e)) }
        rule expr() -> Node
            = precedence! {
                l:(@) _ "&&" _ r:@ { Node::Opr("&&".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "||" _ r:@ { Node::Opr("||".to_string(),Box::new(l), Box::new(r)) }
                --
                l:(@) _ "=" _ r:@ { Node::Opr("=".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "==" _ r:@ { Node::Opr("==".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "!=" _ r:@ { Node::Opr("!=".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "!==" _ r:@ { Node::Opr("!==".to_string(),Box::new(l), Box::new(r)) }
                --
                l:(@) _ "<" _ r:@ { Node::Opr("<".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "<=" _ r:@ { Node::Opr("<=".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ ">" _ r:@ { Node::Opr(">".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ ">=" _ r:@ { Node::Opr(">=".to_string(),Box::new(l), Box::new(r)) }
                --
                l:(@) _ "+" _ r:@ { Node::Opr("+".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "-" _ r:@ { Node::Opr("-".to_string(),Box::new(l), Box::new(r)) }
                --
                l:(@) _ "*" _ r:@ { Node::Opr("*".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "/" _ r:@ { Node::Opr("/".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "%" _ r:@ { Node::Opr("%".to_string(),Box::new(l), Box::new(r)) }
                --
                l:@ _ "^" _ r:(@) { Node::Opr("^".to_string(),Box::new(l), Box::new(r)) }
                --
                _ "!" _ r:@ { Node::UOpr("!".to_string(), Box::new(r)) }
                _ "+" _ r:@ { Node::UOpr("+".to_string(), Box::new(r)) }
                _ "-" _ r:@ { Node::UOpr("-".to_string(), Box::new(r)) }
                _ "√" _ r:@ { Node::UOpr("√".to_string(), Box::new(r)) }
                --
                l:(@) _ "::" _ r:key() { Node::Key(Box::new(l), r) }
                l:(@) _ ":[" _ r:expr() "]" { Node::Opr(":[]".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "(" _ r:expr() ")" { Node::Opr("()".to_string(),Box::new(l), Box::new(r)) }
                l:(@) _ "@(" _ r:expr() ")" { Node::Opr("@()".to_string(),Box::new(l), Box::new(r)) }
                --
                "(" _ c:expr() _ ")" { c }
                n:literal() { n }
                i:var() { i }
            }
        rule literal() -> Node
            = n:$(['0'..='9']+"."['0'..='9']+) { (Node::Number(n.parse().unwrap())) }
            / n:$(['0'..='9']+) { (Node::Number(n.parse().unwrap())) }
            / n:$("true") { (Node::Bool(true)) }
            / n:$("false") { (Node::Bool(false)) }
            / "\"" s:$((("\\\"")/[^'\"'])*) "\"" {Node::String(s.to_string())}
        rule var() -> Node
            = i:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) {Node::Var(i.to_string())}
        rule key() -> String
            = i:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) {i.to_string()}
        rule _()
            = quiet!{ " "* }
    }
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