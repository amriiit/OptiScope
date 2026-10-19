%skeleton "lalr1.cc"
%require "3.8"
%define api.namespace {opti}
%define api.parser.class {Parser}
%define api.value.type variant
%define api.location.type {Loc}
%define parse.error detailed
%locations
%code requires { #include "ast.hpp" }
%code { int yylex(opti::Parser::semantic_type*, opti::Parser::location_type*); }
%token <std::string> TYPE IDENT NUMBER STRING BOOL
%token FOR WHILE IF ELSE RETURN INC DEC ADDASS SUBASS MULASS DIVASS EQ NE LE GE AND OR BAD
%type <N> program functions function parameters params block statements statement decl declcore expr opt_expr args arguments
%type <std::string> assignop
%right '=' ADDASS SUBASS MULASS DIVASS
%left OR
%left AND
%left EQ NE
%left '<' '>' LE GE
%left '+' '-'
%left '*' '/' '%'
%precedence UNARY
%precedence INC DEC
%precedence '[' 
%precedence THEN
%precedence ELSE
%%
program: functions {root=$1;root->loc=@$;$$=root;};
functions: %empty {$$=make<Kind::Program>("",@$);} | functions function {$$=$1;$$->children.push_back($2);};
function: TYPE IDENT '(' parameters ')' block {$$=make<Kind::FunctionDecl>($2,@$,{$4,$6});$$->text=$1+" "+$2;};
parameters: %empty {$$=make<Kind::Parameters>("",@$);} | params {$$=$1;};
params: TYPE IDENT {$$=make<Kind::Parameters>("",@$,{make<Kind::VarDecl>($1+" "+$2,@$)});} | params ',' TYPE IDENT {$$=$1;$$->children.push_back(make<Kind::VarDecl>($3+" "+$4,Loc{@3.begin,@4.end}));};
block: '{' statements '}' {$$=$2;$$->loc=@$;};
statements: %empty {$$=make<Kind::Block>("",@$);} | statements statement {$$=$1;$$->children.push_back($2);};
statement: block {$$=$1;} | decl {$$=$1;} | expr ';' {$$=make<Kind::ExprStmt>("",@$,{$1});} | ';' {$$=make<Kind::Empty>("",@$);}
| FOR '(' declcore ';' opt_expr ';' opt_expr ')' statement {$$=make<Kind::ForStmt>("for",@$,{$3,$5,$7,$9});}
| FOR '(' opt_expr ';' opt_expr ';' opt_expr ')' statement {$$=make<Kind::ForStmt>("for",@$,{$3,$5,$7,$9});}
| WHILE '(' expr ')' statement {$$=make<Kind::WhileStmt>("while",@$,{$3,$5});}
| IF '(' expr ')' statement %prec THEN {$$=make<Kind::IfStmt>("if",@$,{$3,$5});}
| IF '(' expr ')' statement ELSE statement {$$=make<Kind::IfStmt>("if",@$,{$3,$5,$7});}
| RETURN opt_expr ';' {$$=make<Kind::ReturnStmt>("return",@$,{$2});};
decl: declcore ';' {$$=$1;$$->loc=@$;};
declcore: TYPE IDENT {$$=make<Kind::VarDecl>($1+" "+$2,@$);} | TYPE IDENT '=' expr {$$=make<Kind::VarDecl>($1+" "+$2,@$,{$4});} | TYPE IDENT '[' expr ']' {$$=make<Kind::VarDecl>($1+" "+$2+"[]",@$,{$4});};
opt_expr: %empty {$$=make<Kind::Empty>("",@$);} | expr {$$=$1;};
assignop: '=' {$$="=";} | ADDASS {$$="+=";} | SUBASS {$$="-=";} | MULASS {$$="*=";} | DIVASS {$$="/=";};
expr: IDENT {$$=make<Kind::Identifier>($1,@$);} | NUMBER {$$=make<Kind::Literal>($1,@$);} | STRING {$$=make<Kind::Literal>($1,@$);} | BOOL {$$=make<Kind::Literal>($1,@$);}
| '(' expr ')' {$$=$2;$$->loc=@$;}
| expr assignop expr %prec '=' {$$=make<Kind::Assignment>($2,@$,{$1,$3});}
| expr '+' expr {$$=make<Kind::BinaryExpr>("+",@$,{$1,$3});} | expr '-' expr {$$=make<Kind::BinaryExpr>("-",@$,{$1,$3});}
| expr '*' expr {$$=make<Kind::BinaryExpr>("*",@$,{$1,$3});} | expr '/' expr {$$=make<Kind::BinaryExpr>("/",@$,{$1,$3});} | expr '%' expr {$$=make<Kind::BinaryExpr>("%",@$,{$1,$3});}
| expr '<' expr {$$=make<Kind::BinaryExpr>("<",@$,{$1,$3});} | expr '>' expr {$$=make<Kind::BinaryExpr>(">",@$,{$1,$3});}
| expr LE expr {$$=make<Kind::BinaryExpr>("<=",@$,{$1,$3});} | expr GE expr {$$=make<Kind::BinaryExpr>(">=",@$,{$1,$3});}
| expr EQ expr {$$=make<Kind::BinaryExpr>("==",@$,{$1,$3});} | expr NE expr {$$=make<Kind::BinaryExpr>("!=",@$,{$1,$3});}
| expr AND expr {$$=make<Kind::BinaryExpr>("&&",@$,{$1,$3});} | expr OR expr {$$=make<Kind::BinaryExpr>("||",@$,{$1,$3});}
| '-' expr %prec UNARY {$$=make<Kind::UnaryExpr>("-",@$,{$2});} | '+' expr %prec UNARY {$$=make<Kind::UnaryExpr>("+",@$,{$2});} | '!' expr %prec UNARY {$$=make<Kind::UnaryExpr>("!",@$,{$2});}
| expr INC {$$=make<Kind::UnaryExpr>("post++",@$,{$1});} | expr DEC {$$=make<Kind::UnaryExpr>("post--",@$,{$1});}
| INC expr %prec UNARY {$$=make<Kind::UnaryExpr>("pre++",@$,{$2});} | DEC expr %prec UNARY {$$=make<Kind::UnaryExpr>("pre--",@$,{$2});}
| IDENT '(' arguments ')' {$$=make<Kind::CallExpr>($1,@$,$3->children);}
| expr '[' expr ']' {$$=make<Kind::ArrayAccess>("[]",@$,{$1,$3});};
arguments: %empty {$$=make<Kind::Parameters>("",@$);} | args {$$=$1;};
args: expr {$$=make<Kind::Parameters>("",@$,{$1});} | args ',' expr {$$=$1;$$->children.push_back($3);};
%%
void opti::Parser::error(const location_type& l,const std::string& m){parseErrors.push_back("Line "+std::to_string(l.begin.line)+": "+m+". Only the documented C++ subset is supported.");}
