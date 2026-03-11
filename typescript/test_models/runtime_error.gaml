model rterr

global {
    reflex ref_eror{
        let i <- 1/0;
    }
}

experiment exp{

    reflex ref_eror{
        let i <- 1/0;
    }
}