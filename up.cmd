@echo off

@echo We're using batch because I'm on windows, and there's a bug in docker that prevents me from doing this in a sh file

set here=%cd%

@echo Mounting directory %here%

docker run -v %here%:/cejs/src -i chatexchangejs