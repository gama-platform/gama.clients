model slow

global {
    init{
    }

    reflex slow_action {
        matrix m <- matrix_with(1000, rnd(0.0,1.0));
        m <- shuffle(m);
    }
}

experiment ex;