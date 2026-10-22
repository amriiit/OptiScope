#include "instrumenter.hpp"
namespace optiscope {
const char *profilerRuntime() {
  return R"OPTI(
#include <chrono>
#include <fstream>
#include <vector>
#include <map>
namespace optiscope_internal {
using Clock=std::chrono::steady_clock;
struct Record { long long inclusive=0, exclusive=0, calls=0; };
inline std::map<int,Record> records;
inline bool running=false;
struct Timer; inline std::vector<Timer*> stack;
struct Timer { int id; Clock::time_point start; long long children=0; bool active=false;
 explicit Timer(int i):id(i),start(Clock::now()),active(running){ if(active) stack.push_back(this); }
 ~Timer(){if(!active)return;auto ns=std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now()-start).count();stack.pop_back();auto &r=records[id];r.inclusive+=ns;r.exclusive+=ns-children;r.calls++;if(!stack.empty())stack.back()->children+=ns;}
};
struct Total { Clock::time_point start=Clock::now(); Total(){running=true;} ~Total(){running=false;auto ns=std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now()-start).count();std::ofstream out("/work/profile.tsv");out<<"total "<<ns<<'\n';for(auto &p:records)out<<"R"<<p.first<<' '<<p.second.inclusive<<' '<<p.second.exclusive<<' '<<p.second.calls<<'\n';} };
}
)OPTI";
}
} // namespace optiscope
