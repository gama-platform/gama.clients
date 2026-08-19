model actions

global {
    int counter <- 0;

    list getStaticSpecies {
        return ["province", "park", "road"];
    }

    action bump(int nb) {
        counter <- counter + nb;
    }

    int zero <- 0;

    action fail() {
        write 1 / zero;
    }

    init {
        create thing number: 3;
    }
}

species thing {
    int val <- 7;

    int getVal {
        return val;
    }
}

experiment ex;
