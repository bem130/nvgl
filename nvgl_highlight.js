const tokenizer = {
    tokenizer: {
        root: [
            [/#\*/, { token: 'comment.enclosure', next: '@Bcomment' }],
            [/#/, { token: 'comment.enclosure', next: '@Lcomment' }],
            {include: "@tlobj_a"},
            {include: "@tlobj_b"},
            //[/<::/, { token: 'comment.enclosure', next: '@MLTextA' }],
            // [/0[xX][0-9a-fA-F]+/, 'number'],
            // [/\d+/, 'number'],
            // [/(module|import|export|memory|data|table|elem|func|type|call|param|result)/, "keyword"],
        ],
        Lcomment: [
            [/.*/, 'comment', '@pop'],
        ],
        Bcomment: [
            [/\*#/, 'comment.enclosure', '@pop'],
            [/[^(*\n]+/, 'comment'],
            [/[(\*]/, 'comment']
        ],
        MLstring: [
            [/.*/, 'string', '@pop'],
        ],
        tlobj_a: [
            [/@(?=((includes|imports|init|timeline) *{?))/,{token:"tlobj.symbol",next:"@tlobja_"}],
            [/\{/, { token: 'delimiter.brace', next: '@block' }]
        ],
        tlobj_b: [
            [/@(?=((item|obj)?))/,{token:"tlobj.symbol",next:"@tlobjb_"}],
            [/@(?=((item|obj) *([0-9a-zA-Z]|_)+?))/,{token:"tlobj.symbol",next:"@tlobjb_"}],
            [/@(?=((item|obj) +([0-9a-zA-Z]|_)+? *{?))/,{token:"tlobj.symbol",next:"@tlobjb_"}],
            [/\{/, { token: 'delimiter.brace', next: '@block' }]
        ],
        tlobja_: [
            [/(includes|imports|init|timeline)/,"tlobj.type","@pop"],
        ],
        tlobjb_: [
            [/(item|obj)/,"tlobj.type"],
            [/([0-9a-zA-Z]|_)+/,"tlobj.name","@pop"],
        ],
        sexpr: [
            {include: "@block"},
            [/\)/,{token:"delimiter.parentheses.sexpr", next: "@pop"}],
        ],
        exprgroup: [
            {include: "@block"},
            [/\)/,{token:"delimiter.parentheses.exprgroup", next: "@pop"}],
        ],
        block: [
            [/{/,{token:"delimiter.brace", next: "@block"}],
            [/}/,{token:"delimiter.brace", next: "@pop"}],
            
            [/\\\(/,{token:"delimiter.parentheses.sexpr", next: "@sexpr"}],
            [/\(/,{token:"delimiter.parentheses.exprgroup", next: "@exprgroup"}],
            [/#[0-9a-fA-F]{8}/,"color"],
            [/#[0-9a-fA-F]{6}/,"color"],
            [/#[0-9a-fA-F]{4}/,"color"],
            [/#[0-9a-fA-F]{3}/,"color"],
            [/#\*/, { token: 'comment.enclosure', next: '@Bcomment' }],
            [/#/, { token: 'comment.enclosure', next: '@Lcomment' }],
            [/"(\\.|[^"\\])*"/, "string"],
            [/^ *:/, { token: 'MLstringstart', next: '@MLstring' }],
            [/([0-9a-zA-Z]|_)+ *(?=<:)/, "variable.loc"],
            [/([0-9a-zA-Z]|_)+ *(?=<::)/, "variable.loc"],
            [/!(return|break|continue) */, "keyword.control"],
            [/(if|else|elif|while|times) */, "keyword.control"],
            [/[0-9]+/, "number"],
            [/([0-9a-zA-Z]|_)+ *(?=:)/, "objkey"],
            [/([0-9a-zA-Z]|_)+/, "variable"],
        ],
        // MLTextA: [
        //     [/^/, 'comment.enclosure', '@pop'],
        //     [/[^(*\n]+/, 'comment'],
        //     [/[(\*]/, 'comment']
        // ],
    },
}

const theme = {
    base: "vs-dark",
    inherit: true,
    rules: [
        { token: "comment", fontStyle: "italic"},
        { token: "comment.enclosure", foreground: "#607060"},
        { token: "delimiter.brace", foreground: "#b0abff"},
        { token: "tlobj.symbol", foreground: "#bbbbff"},
        { token: "tlobj.type", foreground: "#f772df"},
        { token: "tlobj.name", foreground: "#ffcc85"},
        { token: "color", foreground: "#79bf9f"},
        { token: "keyword.control", foreground: "#ff5999"},
        { token: "objkey", foreground: "#6786c2"},
        { token: "delimiter.parentheses.sexpr", foreground: "#b0abbf"},
        { token: "delimiter.parentheses.exprgroup", foreground: "#b0abaf"},
        { token: "MLstringstart", foreground: "#707b2f"},
        { token: "variable", foreground: "#47a2df"},
        { token: "variable.loc", foreground: "#ffcc85"},
    ],
    colors: {},
}


export {tokenizer,theme};