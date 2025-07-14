model random

global{
    int val;
    reflex r {
        val <- rnd();
    }

}

experiment ex {
    parameter "Seed" var:seed;
}