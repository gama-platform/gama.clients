
model test

global
{
	reflex stop when: cycle > 5
	{
		do pause;
	}
	reflex save_test
	{
		save cycle to: "C:/Test/Output/test1.txt" format: "txt";
	}
}

experiment exp type: gui until:cycle >1
{
	output
	{
		display "display"
		{
			chart "log"
			{
				data "log" value: log(cycle+1);
			}
		}

	}
}