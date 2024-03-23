use serde::Serialize;

#[derive(Debug,Serialize,Clone)]
pub enum Node {
    // literal type
    Number(NumberNode),
    Bool(BoolNode),
    String(StringNode),
    // identifier
    Var(VarNode),
    Key(KeyNode),
    // operation
    Opr(OprNode),
    UOpr(UOprNode),
    // statement
    Stat(StatNode),
    AssignStat(AssignStatNode),
    ReturnStat(ReturnStatNode),
    Scope(),
}

#[derive(Debug,Serialize,Clone)]
pub struct NumberNode {
    pub val: f64,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct BoolNode {
    pub val: bool,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct StringNode {
    pub val: String,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct VarNode {
    pub val: String,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct KeyNode {
    pub l: Box<Node>,
    pub r: Box<Node>,
    pub pos: NodePos,
}

#[derive(Debug,Serialize,Clone)]
pub struct OprNode {
    pub opr: String,
    pub l: Box<Node>,
    pub r: Box<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct UOprNode {
    pub opr: String,
    pub r: Box<Node>,
    pub pos: NodePos,
}

#[derive(Debug,Serialize,Clone)]
pub struct ExprNode {
    pub expr: Box<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct StatNode {
    pub expr: Box<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct AssignStatNode {
    pub loc: Box<Node>,
    pub expr: Box<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct ReturnStatNode {
    pub expr: Box<Node>,
    pub pos: NodePos,
}


#[derive(Debug,Serialize,Clone)]
pub struct NodePos {
    pub start: usize,
    pub end: usize,
}