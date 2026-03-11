model exp_with_params

global {

    int i <- -1;
    int j <- -2;
    float f <- -1.0;
    string s <- "";
    rgb color <- #black;
}
experiment ex {

    parameter 'i' var:i;
    parameter 'f' var:f;
    parameter 's' var:s;
    parameter 'color' var:color;


}