CXX ?= g++
CXXFLAGS = -std=c++17 -O2 -Wall -Wextra -Iengine/include -Iengine/build
ENGINE_SOURCES := $(wildcard engine/src/*.cpp)
ENGINE_HEADERS := $(wildcard engine/include/*.hpp)
.PHONY: engine clean test
engine: engine/build/optiscope
engine/build/parser.cpp engine/build/parser.hpp &: engine/parser/parser.y engine/include/ast.hpp
	@mkdir -p engine/build
	bison -Wall -d --defines=engine/build/parser.hpp -o engine/build/parser.cpp engine/parser/parser.y
engine/build/lexer.cpp: engine/lexer/lexer.l engine/build/parser.hpp
	flex -o $@ $<
engine/build/optiscope: engine/build/parser.cpp engine/build/lexer.cpp $(ENGINE_SOURCES) $(ENGINE_HEADERS)
	$(CXX) $(CXXFLAGS) engine/build/parser.cpp engine/build/lexer.cpp $(ENGINE_SOURCES) -o $@
clean:
	rm -rf engine/build
test:
	npm test

# Optional native LibTooling build; normal engine builds retain Flex/Bison only.
LLVM_CONFIG ?= llvm-config-14
CLANG_CXX ?= clang++-14
CLANG_LINK ?= -l:libclang-cpp.so.14
CLANG_SOURCES := $(filter-out engine/src/main.cpp engine/src/legacy_frontend.cpp,$(ENGINE_SOURCES)) $(wildcard engine/clang/*.cpp)
.PHONY: clang-engine
clang-engine: engine/build/optiscope-clang
engine/build/optiscope-clang: $(CLANG_SOURCES) $(ENGINE_HEADERS)
	@mkdir -p engine/build
	$(CLANG_CXX) -std=c++17 -O1 -Wall -Wextra -Iengine/include -isystem `$(LLVM_CONFIG) --includedir` $(CLANG_SOURCES) -L`$(LLVM_CONFIG) --libdir` $(CLANG_LINK) `$(LLVM_CONFIG) --libs --system-libs` -o $@
