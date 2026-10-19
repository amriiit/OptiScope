#include "ast.hpp"
#include "parser.hpp"
#include <fstream>
#include <algorithm>
#include <map>
#include <set>
#include <functional>
#include <cmath>
N root; std::vector<std::string> parseErrors;
extern FILE* yyin;
using K=Kind;
static std::string name(N n){auto p=n->text.find(' ');auto value=p==std::string::npos?n->text:n->text.substr(p+1);if(value.size()>2&&value.substr(value.size()-2)=="[]")value.resize(value.size()-2);return value;}
static void walk(N n,const std::function<void(N)>& f){if(!n)return;f(n);for(auto c:n->children)walk(c,f);}
static std::set<std::string> ids(N n){std::set<std::string> r;walk(n,[&](N x){if(x->kind==K::Identifier)r.insert(x->text);});return r;}
static std::set<std::string> writes(N n){std::set<std::string> r;walk(n,[&](N x){if(x->kind==K::VarDecl)r.insert(name(x));if((x->kind==K::Assignment || (x->kind==K::UnaryExpr && x->text.find("++")!=std::string::npos) || (x->kind==K::UnaryExpr && x->text.find("--")!=std::string::npos))&&!x->children.empty()){auto t=x->children[0];while(t->kind==K::ArrayAccess)t=t->children[0];if(t->kind==K::Identifier)r.insert(t->text);}});return r;}
struct Term {std::map<std::string,int> p;};
struct Cost {bool unknown=false; std::vector<Term> terms={Term{}};};
static bool dominates(const Term&a,const Term&b){for(auto [s,e]:b.p){auto it=a.p.find(s);if(it==a.p.end()||it->second<e){if(s.rfind("log ",0)==0){auto linear=a.p.find(s.substr(4));int used=b.p.count(s.substr(4))?b.p.at(s.substr(4)):0;if(linear!=a.p.end()&&linear->second>used)continue;}return false;}}return true;}
static Cost normalize(Cost c){std::vector<Term> t;for(auto a:c.terms){bool skip=false;for(auto b:t)if(dominates(b,a))skip=true;if(skip)continue;t.erase(std::remove_if(t.begin(),t.end(),[&](Term b){return dominates(a,b);}),t.end());t.push_back(a);}c.terms=t;return c;}
static Cost add(Cost a,Cost b){a.unknown|=b.unknown;a.terms.insert(a.terms.end(),b.terms.begin(),b.terms.end());return normalize(a);}
static Cost mul(Cost a,Cost b){Cost r;r.unknown=a.unknown||b.unknown;r.terms.clear();for(auto x:a.terms)for(auto y:b.terms){auto z=x;for(auto [s,e]:y.p)z.p[s]+=e;r.terms.push_back(z);}return normalize(r);}
static std::string show(Cost c){if(c.unknown)return "Unknown";std::string s="O(";for(size_t i=0;i<c.terms.size();i++){if(i)s+=" + ";auto t=c.terms[i];if(t.p.empty())s+="1";bool first=true;for(auto [v,e]:t.p){if(!first)s+=" * ";first=false;s+=v;if(e>1)s+="^"+std::to_string(e);}}return s+")";}
static bool number(N n,double& v){if(n->kind!=K::Literal)return false;try{size_t k;v=std::stod(n->text,&k);return k==n->text.size();}catch(...){return false;}}
struct Region {N node; std::string id,fn,reason;Cost cost; std::vector<std::string> assumptions;int depth;};
struct Rec {std::string id,region,pattern,severity,evidence,advice,caveat;int start,end;};
static std::vector<Region> regions;static std::vector<Rec> recs;static std::vector<std::string> warnings;static std::map<std::string,N> funcs;static std::set<std::string> pure;static int maxDepth=0,forCount=0,whileCount=0;
static bool pureExpr(N n){if(n->kind!=K::Literal&&n->kind!=K::Identifier&&n->kind!=K::BinaryExpr&&n->kind!=K::UnaryExpr)return false;if(n->text.find("++")!=std::string::npos||n->text.find("--")!=std::string::npos)return false;for(auto c:n->children)if(!pureExpr(c))return false;return true;}
static Cost analyze(N n,std::string fn,int depth,std::set<std::string> ancestors,bool conditional=false){
 if(n->kind==K::ForStmt||n->kind==K::WhileStmt){
  int idx=regions.size();std::string id="R"+std::to_string(idx+1);n->regionId=id;regions.push_back({n,id,fn,"",{}, {},depth+1});maxDepth=std::max(maxDepth,depth+1);if(n->kind==K::ForStmt)forCount++;else whileCount++;
  Cost iterations; std::string reason="Unknown progression or termination; no exact estimate is claimed.";std::vector<std::string> assumptions;
  N body=n->children.back();std::string induction;
  if(n->kind==K::ForStmt){auto init=n->children[0],cond=n->children[1],update=n->children[2];N initial;
   if(init->kind==K::VarDecl&&!init->children.empty()){induction=name(init);initial=init->children[0];}
   if(init->kind==K::Assignment&&init->text=="="&&init->children[0]->kind==K::Identifier){induction=init->children[0]->text;initial=init->children[1];}
   bool valid=false,log=false;double step=0,start=0;bool hasStart=initial&&number(initial,start);
   if(!induction.empty()&&cond->kind==K::BinaryExpr&&cond->children[0]->kind==K::Identifier&&cond->children[0]->text==induction){
    auto bound=cond->children[1];bool ascending=cond->text=="<"||cond->text=="<=";bool descending=cond->text==">"||cond->text==">=";
    if(update->kind==K::UnaryExpr&&update->children[0]->kind==K::Identifier&&update->children[0]->text==induction){step=update->text.find("++")!=std::string::npos?1:-1;valid=(ascending&&step>0)||(descending&&step<0);}
    if(update->kind==K::Assignment&&update->children[0]->kind==K::Identifier&&update->children[0]->text==induction&&number(update->children[1],step)){
     if(update->text=="+=")valid=(ascending&&step>0)||(descending&&step<0);
     if(update->text=="-=")valid=(ascending&&step<0)||(descending&&step>0);
     if(update->text=="*="&&step>1&&ascending&&hasStart&&start>=1){valid=true;log=true;}
     if(update->text=="/="&&step>1&&descending){double limit;valid=number(bound,limit)&&limit>=1&&initial&&(initial->kind==K::Identifier||(hasStart&&start>=1));log=valid;}
    }
    auto mutated=writes(body);auto boundIds=ids(bound);bool unsafe=mutated.count(induction);for(auto s:boundIds)unsafe|=mutated.count(s)||ancestors.count(s);
    bool hasCall=false;walk(body,[&](N x){if(x->kind==K::CallExpr&&!pure.count(x->text))hasCall=true;});unsafe|=hasCall;
    if(valid&&!unsafe){
     double limit;bool literalBound=number(bound,limit);std::string symbol;
     if(literalBound&&hasStart){reason="Literal initializer and literal bound with monotone constant progression: fixed work with respect to named input sizes.";}
     else if(ascending&&hasStart&&bound->kind==K::Identifier){symbol=bound->text;reason=log?"Positive constant start and multiplicative update toward a named bound.":"Constant start, named upper bound, and constant nonzero step.";}
     else if(descending&&literalBound&&initial&&initial->kind==K::Identifier){symbol=initial->text;reason=log?"Named initial size repeatedly divided by a constant greater than one.":"Named initial size decreases by a constant toward a literal lower bound.";}
     else valid=false;
     if(valid&&!symbol.empty())iterations.terms[0].p[log?"log "+symbol:symbol]=1;
     if(valid)assumptions={"Named size bounds are treated as independent nonnegative input parameters, even when demo code initializes them with literals.","Arithmetic does not overflow; loop body does not mutate the bound or induction variable; single-threaded execution.","Conservative structural estimate; early returns and branches may reduce actual work."};
    }else valid=false;
   }
   if(!valid){iterations.unknown=true;reason="Cannot establish a safe canonical progression, independent bound, and known body effects.";}
  }else{iterations.unknown=true;reason="While-loop termination and iteration count are not inferred in this MVP.";}
  if(!induction.empty())ancestors.insert(induction);
  Cost bodyCost=analyze(body,fn,depth+1,ancestors,conditional);auto c=mul(iterations,bodyCost);
  auto &r=regions[idx];r.cost=c;r.reason=reason+" Body cost: "+show(bodyCost)+"; nested costs multiply, sequential costs use their dominant terms.";r.assumptions=assumptions;if(conditional)r.assumptions.push_back("Conditionally executed: estimate is an upper envelope when this branch is reached.");return c;
 }
 if(n->kind==K::CallExpr){bool scalarPrint=n->text=="printf"&&!n->children.empty()&&n->children[0]->kind==K::Literal&&n->children[0]->text.find("%s")==std::string::npos&&n->children[0]->text.find("%n")==std::string::npos;for(auto a:n->children)scalarPrint=scalarPrint&&pureExpr(a);if(!pure.count(n->text)&&!scalarPrint)return {true,{Term{}}};}
 Cost c;for(auto child:n->children)c=add(c,analyze(child,fn,depth,ancestors,conditional||n->kind==K::IfStmt));return c;
}
static std::string inductionOf(N n){if(n->kind!=K::ForStmt)return "";auto init=n->children[0];if(init->kind==K::VarDecl)return name(init);if(init->kind==K::Assignment&&init->children[0]->kind==K::Identifier)return init->children[0]->text;return "";}
static void recommend(){for(auto &r:regions){N body=r.node->children.back();auto mutated=writes(r.node);auto addRec=[&](std::string pattern,std::string evidence,std::string advice,std::string caveat){for(auto a:recs)if(a.region==r.id&&a.pattern==pattern)return;recs.push_back({"REC"+std::to_string(recs.size()+1),r.id,pattern,"info",evidence,advice,caveat,r.node->loc.begin.line,r.node->loc.end.line});};
 walk(body,[&](N x){
  if(x->kind==K::BinaryExpr&&(x->text=="*"||x->text=="/")&&pureExpr(x)){auto vars=ids(x);bool stable=!vars.empty();for(auto s:vars)if(mutated.count(s))stable=false;if(stable)addRec("Loop-invariant arithmetic","Arithmetic operands ("+x->text+") are unchanged throughout this loop.","Consider computing this expression once before the loop.","Preserve evaluation order, floating-point exceptions and zero-iteration behavior; compiler optimization may already hoist it.");}
  if(x->kind==K::CallExpr&&pure.count(x->text)){bool stable=true;for(auto a:x->children){if(!pureExpr(a))stable=false;for(auto v:ids(a))if(mutated.count(v))stable=false;}if(stable)addRec("Repeated pure function call","The local function "+x->text+" has a single side-effect-free return expression and invariant arguments.","Consider computing this repeated result once and reusing it if profiling shows meaningful cost.","Do not assume this call is expensive; preserve zero-iteration behavior and arithmetic exception semantics.");}
 });
 walk(body,[&](N inner){if(inner->kind!=K::ForStmt||r.node->kind!=K::ForStmt||inner==r.node)return;walk(inner->children.back(),[&](N x){if(x->kind!=K::BinaryExpr||x->text!="==")return;auto a=x->children[0],b=x->children[1];if(a->kind==K::ArrayAccess&&b->kind==K::ArrayAccess){auto ai=ids(a->children[1]),bi=ids(b->children[1]);auto outerVar=inductionOf(r.node),innerVar=inductionOf(inner);if(!((ai.count(outerVar)&&bi.count(innerVar))||(bi.count(outerVar)&&ai.count(innerVar))))return;addRec("Nested pairwise equality","An equality comparison between two indexed values occurs inside nested for loops.","Consider indexing values with a hash table when the task is membership or matching.","Array equality alone does not prove a replaceable algorithm. Preserve duplicate counts, ordering and all side effects; hashing uses extra memory.");}else if(a->kind==K::ArrayAccess||b->kind==K::ArrayAccess){auto indexed=a->kind==K::ArrayAccess?a:b,other=a->kind==K::ArrayAccess?b:a;if(!ids(indexed->children[1]).count(inductionOf(inner))||ids(other).count(inductionOf(inner)))return;auto &ir=*std::find_if(regions.begin(),regions.end(),[&](const Region& q){return q.node==inner;});if(!ir.cost.unknown&&show(ir.cost).find("log")==std::string::npos&&show(ir.cost)!="O(1)")addRec("Repeated linear equality scan","An inner loop with an established linear range compares an indexed value for equality.","If this scan implements repeated membership queries, consider unordered_set or unordered_map.","This is a scan candidate, not proof of a search. Preserve duplicates, ordering, mutations and query semantics.");}});});
 }}
static void symbols(N n,std::vector<std::set<std::string>>& scopes){bool enter=n->kind==K::Block||n->kind==K::FunctionDecl||n->kind==K::ForStmt;if(enter)scopes.emplace_back();if(n->kind==K::VarDecl){auto v=name(n);if(!scopes.back().insert(v).second)warnings.push_back("Duplicate declaration in a lexical scope: "+v+" (line "+std::to_string(n->loc.begin.line)+"). Compiler validation is required.");}if(n->kind==K::Identifier){bool found=false;for(auto it=scopes.rbegin();it!=scopes.rend();++it)if(it->count(n->text))found=true;if(!found)warnings.push_back("Unresolved identifier "+n->text+" at line "+std::to_string(n->loc.begin.line)+"; compiler validation is required.");}for(auto c:n->children)symbols(c,scopes);if(enter)scopes.pop_back();}
static std::string strings(const std::vector<std::string>& a){std::string s="[";for(size_t i=0;i<a.size();i++){if(i)s+=",";s+=quote(a[i]);}return s+"]";}
static const char* runtime=R"OPTI(
#include <chrono>
#include <fstream>
#include <vector>
#include <map>
namespace optiscope_internal {
using Clock=std::chrono::steady_clock;
struct Record { long long inclusive=0, exclusive=0, calls=0; };
inline std::map<int,Record> records;
struct Timer; inline std::vector<Timer*> stack;
struct Timer { int id; Clock::time_point start; long long children=0;
 explicit Timer(int i):id(i),start(Clock::now()){ stack.push_back(this); }
 ~Timer(){auto ns=std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now()-start).count();stack.pop_back();auto &r=records[id];r.inclusive+=ns;r.exclusive+=ns-children;r.calls++;if(!stack.empty())stack.back()->children+=ns;}
};
struct Total { Clock::time_point start=Clock::now(); ~Total(){auto ns=std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now()-start).count();std::ofstream out("/work/profile.tsv");out<<"total "<<ns<<'\n';for(auto &p:records)out<<"R"<<p.first<<' '<<p.second.inclusive<<' '<<p.second.exclusive<<' '<<p.second.calls<<'\n';} };
}
)OPTI";
static std::string instrument(std::string source){struct Edit {size_t pos;std::string value;};std::vector<Edit> edits;for(auto r:regions){int i=std::stoi(r.id.substr(1));edits.push_back({r.node->loc.begin.offset,"{ optiscope_internal::Timer optiscope_region_"+std::to_string(i)+"("+std::to_string(i)+"); "});edits.push_back({r.node->loc.end.offset," }"});}for(auto f:root->children)if(name(f)=="main")edits.push_back({f->children[1]->loc.begin.offset+1," optiscope_internal::Total optiscope_total; "});std::stable_sort(edits.begin(),edits.end(),[](auto a,auto b){return a.pos>b.pos;});for(auto e:edits)source.insert(e.pos,e.value);return std::string(runtime)+"\n#line 1 \"uploaded.cpp\"\n"+source;}
int main(int argc,char**argv){if(argc<2){std::cerr<<"Usage: optiscope source.cpp [instrumented.cpp]\n";return 2;}std::ifstream in(argv[1],std::ios::binary);if(!in){std::cerr<<"Cannot read input";return 2;}std::string source((std::istreambuf_iterator<char>(in)),{});yyin=fopen(argv[1],"rb");opti::Parser parser;int result=parser.parse();fclose(yyin);if(result||!parseErrors.empty()){std::cout<<"{\"success\":false,\"errors\":"<<strings(parseErrors)<<"}";return 0;}
 for(auto f:root->children)funcs[name(f)]=f;
 for(auto [fn,f]:funcs){auto b=f->children[1];if(b->children.size()==1&&b->children[0]->kind==K::ReturnStmt){auto e=b->children[0]->children[0];auto allowed=std::set<std::string>{};for(auto p:f->children[0]->children)allowed.insert(name(p));bool ok=pureExpr(e);for(auto v:ids(e))if(!allowed.count(v))ok=false;if(ok)pure.insert(fn);}}
 Cost overall;for(auto f:root->children)overall=add(overall,analyze(f->children[1],name(f),0,{}));recommend();std::vector<std::set<std::string>> scopes(1);symbols(root,scopes);
 warnings.push_back("Subset parser, not a full C++ semantic compiler. Estimates parameterize named size variables; literal-only loops are O(1). Function summary is the dominant structural cost across definitions, not a whole-program call-graph proof. Bounded scalar printf calls are modeled as unit cost; external I/O latency is excluded from the complexity model.");warnings.push_back("Unknown calls and while loops make enclosing estimates Unknown. Branch estimates are conservative. Array bounds, overflow, recursion and arbitrary control flow are not proved.");if(!funcs.count("main"))warnings.push_back("No main() definition: static analysis only.");if(argc>2){std::ofstream out(argv[2]);out<<instrument(source);if(!out){std::cerr<<"Cannot write instrumented source";return 2;}}
 std::cout<<"{\"success\":true,\"errors\":[],\"warnings\":"<<strings(warnings)<<",\"summary\":{\"functionsDetected\":"<<root->children.size()<<",\"loopsDetected\":"<<regions.size()<<",\"forLoops\":"<<forCount<<",\"whileLoops\":"<<whileCount<<",\"maxNestingDepth\":"<<maxDepth<<",\"worstEstimatedComplexity\":"<<quote(show(overall))<<",\"totalMeasuredRuntimeMs\":null},\"hasMain\":"<<(funcs.count("main")?"true":"false")<<",\"ast\":"<<astJSON(root)<<",\"regions\":[";
 for(size_t i=0;i<regions.size();i++){if(i)std::cout<<",";auto r=regions[i];std::cout<<"{\"id\":"<<quote(r.id)<<",\"type\":"<<quote(kindName(r.node->kind))<<",\"functionName\":"<<quote(r.fn)<<",\"startLine\":"<<r.node->loc.begin.line<<",\"endLine\":"<<r.node->loc.end.line<<",\"startOffset\":"<<r.node->loc.begin.offset<<",\"endOffset\":"<<r.node->loc.end.offset<<",\"estimatedComplexity\":"<<quote(show(r.cost))<<",\"reasoning\":"<<quote(r.reason)<<",\"assumptions\":"<<strings(r.assumptions)<<",\"measurement\":null}";}
 std::cout<<"],\"recommendations\":[";for(size_t i=0;i<recs.size();i++){if(i)std::cout<<",";auto r=recs[i];std::cout<<"{\"id\":"<<quote(r.id)<<",\"regionId\":"<<quote(r.region)<<",\"pattern\":"<<quote(r.pattern)<<",\"severity\":"<<quote(r.severity)<<",\"startLine\":"<<r.start<<",\"endLine\":"<<r.end<<",\"evidence\":"<<quote(r.evidence)<<",\"recommendation\":"<<quote(r.advice)<<",\"caveat\":"<<quote(r.caveat)<<"}";}std::cout<<"]}";
}
