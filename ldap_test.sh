#!/bin/bash

LDAP_SERVER="ldap://unibasel.ads.unibas.ch"
BIND_DN="d-dmi-admgmt@unibasel.ads.unibas.ch"
BASE_DN="DC=unibasel,DC=ads,DC=unibas,DC=ch"

read -p "Enter username or email to search: " USER_INPUT
ldapsearch -x -b "$BASE_DN" -W -D "$BIND_DN" -H "$LDAP_SERVER" -ZZ \
    "(|(uid=$USER_INPUT)(mail=$USER_INPUT))" cn mail sAMAccountName
