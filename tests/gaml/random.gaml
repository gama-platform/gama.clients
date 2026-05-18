model random

global{
    float val;
    reflex r {
        val <- rnd(0.0,1.0);
    }

}

experiment ex {
    parameter "Seed" var:seed <- 0.0;
}