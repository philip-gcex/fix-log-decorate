A command line parser for FIX protocol messages. This decorates FIX messages with colours fieldnames and value lookups, making them easer to read.

# Example

```sh
echo "8=FIX.4.1|9=61|35=A|34=1|49=EXEC|52=20121105-23:24:06|56=BANZAI|98=0|108=30|10=003|8=FIX.4.1|9=61|35=A|34=1|49=BANZAI|" | \
node fix-log-decorate.mjs --uselookup=1 --usenumber=1 --usevalue=1 --delim="|" --usenewline=1
```

Or using NPX, and skipping heartbeats with `grep -v`:

```sh
tail -f someFIXlog.log | \
grep -v 35=0 | \
npx fix-log-decorate --skip="8 9 10"
```

# Switches:

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

# References

* Fix protocol: https://www.fixtrading.org/what-is-fix/
* NPM: https://www.npmjs.com/package/fix-log-decorate