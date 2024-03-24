use serde::Serialize;

#[derive(Debug,Serialize,Clone)]
pub enum Node {
    // literal type
    Number(NumberNode),
    Bool(BoolNode),
    String(StringNode),
    Array(ArrayNode),
    Object(ObjNode),
    // identifier
    Id(IdNode),
    Key(KeyNode),
    // operation
    Opr(OprNode),
    UOpr(UOprNode),
    // FuncCall
    FuncCall(FuncCallNode),
    NewFuncCall(NewFuncCallNode),
    // statement
    Stat(StatNode),
    ReturnStat(ReturnStatNode),
    AStat(AStatNode),
    MLTAStat(MLTAStatNode),
    PMLTAStat(PMLTAStatNode),
    // rootobj
    // Includes(IncludesNode),
    // Init(InitNode),
    // Item(ItemNode),
    TLObj(TLObjNode),
    Init(InitNode),
    TLObjStat(TLObjStatNode),
    Block(BlockNode),
    // TimeLine(TimeLineNode),
    //
    Scope(),
    Tmp(),
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
pub struct ArrayNode {
    pub val: Vec<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct ObjElmNode {
    pub key: Node,
    pub val: Node,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct ObjNode {
    pub val: Vec<ObjElmNode>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct IdNode {
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
pub struct FuncCallNode {
    pub func: Box<Node>,
    pub args: Vec<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct NewFuncCallNode {
    pub func: Box<Node>,
    pub args: Vec<Node>,
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
pub struct ReturnStatNode {
    pub expr: Box<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct AStatNode {
    pub loc: Box<Node>,
    pub expr: Box<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct MLTAStatNode {
    pub loc: Box<Node>,
    pub val: String,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct PMLTAStatNode {
    pub loc: Box<Node>,
    pub val: String,
    pub expr: Box<Node>,
    pub pos: NodePos,
}

#[derive(Debug,Serialize,Clone)]
pub struct InitNode {
    pub val: Box<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct BlockNode {
    pub stats: Vec<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct TLObjNode {
    pub val: Vec<Node>,
    pub pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct TLObjStatNode {
    pub objname: Box<Node>,
    pub args: Vec<ObjElmNode>,
    pub pos: NodePos,
}


#[derive(Debug,Serialize,Clone)]
pub struct NodePos {
    pub start: usize,
    pub end: usize,
}