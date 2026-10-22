#include <iostream>
struct Node{int value;Node* next;Node(int v,Node* n=nullptr):value(v),next(n){}};
Node* reverseList(Node* head){Node* previous=nullptr;while(head){Node* next=head->next;head->next=previous;previous=head;head=next;}return previous;}
int sumList(const Node* head){int sum=0;for(auto p=head;p;p=p->next)sum+=p->value;return sum;}
int main(){Node c(3),b(2,&c),a(1,&b);Node* h=reverseList(&a);std::cout<<h->value<<" "<<sumList(h)<<"\n";}
