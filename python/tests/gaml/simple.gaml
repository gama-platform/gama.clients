
model simple

global {
    init{
        create simple_agent;
    }
}

species simple_agent{
    int arg;

    init{
        arg <- 5;
    }
}

experiment ex;