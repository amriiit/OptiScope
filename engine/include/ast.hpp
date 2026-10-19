#pragma once
#include <memory>
#include <string>
#include <vector>
#include <sstream>
#include <iostream>
struct Position { int line=1,column=1; size_t offset=0; };
struct Loc { Position begin,end; };
inline std::ostream& operator<<(std::ostream& o,const Loc& l){return o<<l.begin.line<<":"<<l.begin.column;}
enum class Kind { Program,FunctionDecl,Parameters,Block,VarDecl,ForStmt,WhileStmt,IfStmt,ReturnStmt,Assignment,BinaryExpr,UnaryExpr,CallExpr,Identifier,Literal,ArrayAccess,ExprStmt,Empty };
inline std::string kindName(Kind k){static const char* names[]={"Program","FunctionDecl","Parameters","Block","VarDecl","ForStmt","WhileStmt","IfStmt","ReturnStmt","Assignment","BinaryExpr","UnaryExpr","CallExpr","Identifier","Literal","ArrayAccess","ExprStmt","Empty"};return names[(int)k];}
struct Node { Kind kind; std::string text; Loc loc; std::vector<std::shared_ptr<Node>> children; std::string regionId; Node(Kind k,std::string s,Loc l):kind(k),text(s),loc(l){} virtual ~Node()=default; };
using N=std::shared_ptr<Node>;
template<Kind K> struct TypedNode final:Node { TypedNode(std::string s,Loc l):Node(K,s,l){} };
using Program=TypedNode<Kind::Program>; using FunctionDecl=TypedNode<Kind::FunctionDecl>; using Block=TypedNode<Kind::Block>; using VarDecl=TypedNode<Kind::VarDecl>; using ForStmt=TypedNode<Kind::ForStmt>; using WhileStmt=TypedNode<Kind::WhileStmt>; using IfStmt=TypedNode<Kind::IfStmt>; using ReturnStmt=TypedNode<Kind::ReturnStmt>; using Assignment=TypedNode<Kind::Assignment>; using BinaryExpr=TypedNode<Kind::BinaryExpr>; using UnaryExpr=TypedNode<Kind::UnaryExpr>; using CallExpr=TypedNode<Kind::CallExpr>; using Identifier=TypedNode<Kind::Identifier>; using Literal=TypedNode<Kind::Literal>; using ArrayAccess=TypedNode<Kind::ArrayAccess>;
template<Kind K> inline N make(std::string s,Loc l,std::vector<N> c={}){auto n=std::make_shared<TypedNode<K>>(s,l);n->children=std::move(c);return n;}
inline std::string quote(const std::string& s){std::ostringstream o;o<<'"';for(unsigned char c:s){switch(c){case '"':o<<"\\\"";break;case '\\':o<<"\\\\";break;case '\n':o<<"\\n";break;case '\r':o<<"\\r";break;case '\t':o<<"\\t";break;default:if(c<32)o<<"?";else o<<c;}}o<<'"';return o.str();}
inline std::string astJSON(N n){if(!n)return "null";std::string s="{\"type\":"+quote(kindName(n->kind))+",\"text\":"+quote(n->text)+",\"startLine\":"+std::to_string(n->loc.begin.line)+",\"endLine\":"+std::to_string(n->loc.end.line)+",\"startOffset\":"+std::to_string(n->loc.begin.offset)+",\"endOffset\":"+std::to_string(n->loc.end.offset)+",\"regionId\":"+quote(n->regionId)+",\"children\":[";for(size_t i=0;i<n->children.size();i++){if(i)s+=",";s+=astJSON(n->children[i]);}return s+"]}";}
extern N root; extern std::vector<std::string> parseErrors;
