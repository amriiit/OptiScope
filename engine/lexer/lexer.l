%option noyywrap nounput noinput nodefault
%x COMMENT
%{
#include "parser.hpp"
using T=opti::Parser::token;
#define YY_DECL int yylex(opti::Parser::semantic_type* yylval, opti::Parser::location_type* yylloc)
static Position cursor;
#define YY_USER_ACTION yylloc->begin=cursor; for(int i=0;i<yyleng;i++){cursor.offset++;if(yytext[i]=='\n'){cursor.line++;cursor.column=1;}else cursor.column++;} yylloc->end=cursor;
#define VALUE(tok) {yylval->emplace<std::string>(yytext,yyleng);return T::tok;}
%}
%%
^[ \t]*#[ \t]*include[ \t]*[<\"][^>\"\n]+[>\"][^\n]* {}
^[ \t]*#[^\n]* {parseErrors.push_back("Line "+std::to_string(yylloc->begin.line)+": unsupported preprocessor directive; only #include is accepted.");return T::BAD;}
[ \t\r\n]+ {}
"//"[^\n]* {}
"/*" {BEGIN(COMMENT);}
<COMMENT>"*/" {BEGIN(INITIAL);}
<COMMENT>\n|. {}
<COMMENT><<EOF>> {parseErrors.push_back("Unterminated block comment");return T::BAD;}
"break"|"continue"|"do"|"switch"|"case"|"goto"|"throw"|"try"|"catch"|"new"|"delete"|"sizeof"|"const"|"volatile"|"auto"|"long"|"short"|"unsigned"|"signed"|"float"|"char"|"static"|"extern"|"namespace"|"using"|"class"|"struct"|"template"|"typedef"|"enum"|"union" {parseErrors.push_back("Line "+std::to_string(yylloc->begin.line)+": unsupported C++ keyword: "+std::string(yytext,yyleng));return T::BAD;}
"int"|"double"|"bool"|"void" VALUE(TYPE)
"true"|"false" VALUE(BOOL)
"for" return T::FOR;
"while" return T::WHILE;
"if" return T::IF;
"else" return T::ELSE;
"return" return T::RETURN;
"++" return T::INC;
"--" return T::DEC;
"+=" return T::ADDASS;
"-=" return T::SUBASS;
"*=" return T::MULASS;
"/=" return T::DIVASS;
"==" return T::EQ;
"!=" return T::NE;
"<=" return T::LE;
">=" return T::GE;
"&&" return T::AND;
"||" return T::OR;
[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)? VALUE(NUMBER)
\"([^\"\\\n]|\\.)*\" VALUE(STRING)
[a-zA-Z_][a-zA-Z_0-9]* VALUE(IDENT)
[{}()\[\];,+*/%<>=!\-] return yytext[0];
. {parseErrors.push_back("Line "+std::to_string(yylloc->begin.line)+": unknown token '"+std::string(yytext,yyleng)+"'");return T::BAD;}
%%
