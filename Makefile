CXX ?= g++
CXXFLAGS = -std=c++17 -O2 -Wall -Wextra -Iengine/include -Iengine/build
.PHONY: engine clean test
engine: engine/build/optiscope
engine/build/parser.cpp engine/build/parser.hpp &: engine/parser/parser.y engine/include/ast.hpp
	@mkdir -p engine/build
	bison -Wall -d --defines=engine/build/parser.hpp -o engine/build/parser.cpp engine/parser/parser.y
engine/build/lexer.cpp: engine/lexer/lexer.l engine/build/parser.hpp
	flex -o $@ $<
engine/build/optiscope: engine/build/parser.cpp engine/build/lexer.cpp engine/src/main.cpp engine/include/ast.hpp
	$(CXX) $(CXXFLAGS) engine/build/parser.cpp engine/build/lexer.cpp engine/src/main.cpp -o $@
clean:
	rm -rf engine/build
test:
	npm test
