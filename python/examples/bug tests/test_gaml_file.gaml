
model snap

global {

    init{
        create dummy number:10;
    }
	reflex f {
		save snapshot("d") to:"test.png";
	}
}

species dummy {

}


experiment name type: gui {

	output {
         display "d" type:3d{
            species dummy;
         }

	}
}