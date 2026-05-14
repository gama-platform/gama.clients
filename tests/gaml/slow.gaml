model slow

global {
    init{
    }

    reflex slow_action {
         if gama.platform contains "Windows"{
	        let l <- command("ping -n " + 2 + " 127.0.0.1 >nul ");
        }
        else{
        	let l <- command("sleep " + 1);
        }
    }
}

experiment ex;