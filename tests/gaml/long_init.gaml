model longInit

global {

    init {
    	float start <- gama.machine_time;
    	float planned_duration <- 71; // planned waiting duration in seconds
        //write "waiting";
        if gama.platform contains "win32"{
	        let l <- command("ping -n " + (planned_duration+1) + " 127.0.0.1 >nul ");
        }
        else{
        	let l <- command("sleep " + planned_duration);
        }
        //write "ready, took " + (gama.machine_time-start)/1000 +"s";
    }
}

experiment ex;