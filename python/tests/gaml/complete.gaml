model complete

global {

    init {
        create people;
    }


    reflex population_growth when:every(3#cycle) {
        write "population is doubling !";
        int current_pop <- length(people);
        create people number:current_pop;
    }
}

species people {
    int age <- 20;

    reflex aging {
        age <- age + 1;
    }

}


experiment expe record:true;