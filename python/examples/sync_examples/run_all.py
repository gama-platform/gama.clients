import asyncio
import ex01_connect_close as ex01
import ex02_load_stop as ex02
import ex03_play as ex03
import ex04_pause as ex04
import ex05_step as ex05
import ex06_step_back as ex06
import ex07_expression as ex07
import ex08_reload as ex08
import ex09_describe as ex09
import ex10_upload_download as ex10
import ex11_exit as ex11


def main():
    print("running all examples")
    print("example 01")
    asyncio.run(ex01.main())
    print("example 02")
    asyncio.run(ex02.main())
    print("example 03")
    asyncio.run(ex03.main())
    print("example 04")
    asyncio.run(ex04.main())
    print("example 05") 
    asyncio.run(ex05.main())
    print("example 06")
    asyncio.run(ex06.main())
    print("example 07")
    asyncio.run(ex07.main())    
    print("example 08")
    asyncio.run(ex08.main())
    print("example 09")
    asyncio.run(ex09.main())
    print("example 10")
    asyncio.run(ex10.main())
    print("example 11")
    asyncio.run(ex11.main())


if __name__ == "__main__":
    main()
