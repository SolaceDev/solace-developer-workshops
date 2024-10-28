echo "Exposing port 8080"
gh codespace ports visibility 8080:public -c $CODESPACE_NAME
gh codespace ports visibility 1443:public -c $CODESPACE_NAME
gh codespace ports visibility 8008:public -c $CODESPACE_NAME