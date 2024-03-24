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
        tlobj_a: [
            [/@(?=((includes|init|timeline) *{))/,{token:"tlobj.symbol",next:"@tlobja_"}],
            [/\{/, { token: 'delimiter.brace', next: '@block' }]
        ],
        tlobj_b: [
            [/@(?=((item|obj) +([0-9a-zA-Z]|_)+ *{))/,{token:"tlobj.symbol",next:"@tlobjb_"}],
            [/\{/, { token: 'delimiter.brace', next: '@block' }]
        ],
        tlobja_: [
            [/(includes|init|timeline)/,"tlobj.type","@pop"],
        ],
        tlobjb_: [
            [/(item|obj)/,"tlobj.type"],
            [/([0-9a-zA-Z]|_)+/,"tlobj.name","@pop"],
        ],
        block: [
            [/{/,{token:"delimiter.brace", next: "@block"}],
            [/}/,{token:"delimiter.brace", next: "@pop"}],

            [/#[0-9a-fA-F]{8}/,"color"],
            [/#[0-9a-fA-F]{6}/,"color"],
            [/#[0-9a-fA-F]{4}/,"color"],
            [/#[0-9a-fA-F]{3}/,"color"],
            [/#\*/, { token: 'comment.enclosure', next: '@Bcomment' }],
            [/#/, { token: 'comment.enclosure', next: '@Lcomment' }],
            [/"(\\.|[^"\\])*"/, "string"],
            [/^ *:.*/, "string"],
            [/!(return|break|continue) */, "keyword.control"],
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
        { token: "delimiter.brace", foreground: "#805bff"},
        { token: "tlobj.symbol", foreground: "#bbbbff"},
        { token: "tlobj.type", foreground: "#47a2df"},
        { token: "tlobj.name", foreground: "#ffcc75"},
        { token: "color", foreground: "#99bf9f"},
        { token: "keyword.control", foreground: "#ff5999"},
    ],
    colors: {},
}


export {tokenizer,theme};