model complete

global {

    float seed <- 123.0;

    init {
        create people number: 50 {
            age <- 20;
        }
    }

    reflex control_population when:length(people)>1000{
        ask slice(shuffle(people), 1000, length(people)) {
            do die;
        }
    }

}

species people {

    int age <- 0;
    string name <- "Pierre";

    list actions <- [];

    reflex aging {
        age <- age + 1;
    }

    reflex dying when:age>60{
        if flip(0.2) {
            do die;
        }
    }
    
    reflex mating when:age>20 and age<50 {
		if flip (0.1) {
			create people;
		}
	}

}


experiment expe;