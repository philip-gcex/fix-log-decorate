A command line parser for FIX protocol messagers

# Example

```sh
echo "8=FIX.4.1^A9=61^A35=A^A34=1^A49=EXEC^A52=20121105-23:24:06^A56=BANZAI^A98=0^A108=30^A10=003^A8=FIX.4.1^A9=61^A35=A^A34=1^A49=BANZAI^A" | node index.mjs  --uselookup=1 --usenumber=0 --usevalue=1 --delim=" " --usenewline=1
```

Switches:

```
    --usenumber=[0|1]
    --usename=[0|1]
    --usevalue=[0|1]
    --uselookup=[0|1]
    --usenewline=[0|1]
    --skip="9 35 BeginString",
    --keep="8 10 MsgType"
    --delim=|
```
