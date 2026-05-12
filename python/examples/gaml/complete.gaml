model complete

global {

    init {
        create people number: 50 {
            age <- 20;
        }
    }


    reflex population_growth when:every(30#cycle) {
        write "population is doubling !";
        int current_pop <- length(people);
        create people number:current_pop;
    }
}

species people {

    int age <- 0;

    reflex aging {
        age <- age + 1;
    }

    reflex dying when:age>60{
        if flip(0.1) {
            do die;
        }
    }

}


experiment expe record:true;