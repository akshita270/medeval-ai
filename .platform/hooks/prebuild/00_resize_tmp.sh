#!/bin/bash
# /tmp on this platform is a RAM-backed tmpfs capped at ~459M (half of a
# t3.micro's 1GB RAM) -- too small for pip's build/download cache once a
# single dependency (torch, ~539M) is bigger than the whole filesystem.
# The root volume itself has plenty of room (20G), so just give /tmp more
# of it instead of switching to a bigger/costlier instance type.
mount -o remount,size=4G /tmp
