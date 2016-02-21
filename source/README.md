Judge Girl 批改娘簡易安裝手冊
==================

## 準備工作 ##

一台 Linux 作業系統，最好是 Ubuntu，CentOS 和 Debian 可能會沒有要建立沙盒的的環境。

## 起步 ##

假定現在給一台 Ubuntu 14.04 的主機，先增加兩個使用者帳號。

```
$ adduser judgesister
$ adduser butler
```

## 安裝套件 ##

```
$ apt-get install cgroup-bin cgroup-lite libcgroup1
$ apt-get install build-essential nodejs npm
$ apt-get install mysql-server
```

* `cgroup-bin cgroup-lite libcgroup1` 為 Ubuntu 上 cgroup 的相關套件，否則只存在 `/sys/fs/cgroup/systemd`，沙盒需要 `/sys/fs/cgroup/memory`。
* `build-essential nodejs npm` 評測系統後台需使用 gcc 編譯器、前端使用 nodejs 和 npm 套件管理。
* `mysql-server` 資料庫系統使用 MySQL。

## 安裝模組 ##

```
$ git clone https://github.com/JudgeGirl/JudgeNode /home/judgesister/JudgeNode
$ git clone https://github.com/JudgeGirl/Judge-receiver /home/judgesister/Judge-receiver
$ git clone https://github.com/JudgeGirl/Judge-sender /home/judgesister/Judge-sender
$ git clone https://github.com/JudgeGirl/Judge-MySQL /home/judgesister/Judge-MySQL
$ git clone https://github.com/JudgeGirl/Judge-template /home/judgesister/Judge-template
```

系統大致上分成四個部份

### Judge-MySQL ###

記得一開始安裝 `mysql-server` 的 root 密碼，皆下來創立專屬於 Judge Girl 專用的 database。建立一個 `deploy_mySQL.sh`，檔案內容如下：

```
$ cat deploy_mySQL.sh
#!/bin/bash

EXPECTED_ARGS=3
E_BADARGS=65
MYSQL=`which mysql`

Q1="CREATE DATABASE IF NOT EXISTS $1;"
Q2="GRANT USAGE ON *.* TO $2@localhost IDENTIFIED BY '$3';"
Q3="GRANT ALL PRIVILEGES ON $1.* TO $2@localhost;"
Q4="FLUSH PRIVILEGES;"
SQL="${Q1}${Q2}${Q3}${Q4}"

if [ $# -ne $EXPECTED_ARGS ]
then
  echo "Usage: $0 dbname dbuser dbpass"
  exit $E_BADARGS
fi

$MYSQL -uroot -p -e "$SQL"
```

接著，將其變成執行檔後，輸入資料庫名稱、使用者帳號和密碼。

```
$ chmod +x deploy_mySQL.sh
$ ./deploy_mysql.sh <database> <user> <password>
```

接著進入 MySQL，貼上 `./Judge-MySQL/CREATE_TABLE.sql` 的內容，完成建立。

```
$ mysql -u root -p
mysql >> use judgegirl
mysql >> <copy Judge-MySQL/CREATE_TABLE.sql>
```

### Judge-sender ###

定時偵測資料庫中還沒有測試的原始碼，抓取後將測資和原始碼一同丟到遠端機器上進行測試，遠端機器也可以是自身，遠端機器需按照 Judge-receiver 的步驟構造。

由於 MySQL Library 不支援 python 3，但支持 python 2，安裝額外套件使得 MySQL 得以在 python 3 上運行。首先，安裝 `python3-dev`，等下 python3 安裝過程中會需要相關的套件。

```
$ apt-get install python3-dev
```

接著，按照網路提供的[方案](http://stackoverflow.com/questions/12031151/how-to-install-mysqldb-with-python-3-2)解決。

```
$ cd install_tutorial
$ python distribute_setup.py
$ curl -L https://github.com/PyMySQL/PyMySQL/tarball/pymysql-0.6 | tar xz
$ cd PyMySQL-PyMySQL-7c86923/
$ python3 setup.py install
```

* 如果出現 `setuptools not found` [issue](https://github.com/JudgeGirl/Judge-sender/issues/5)
```
wget https://bootstrap.pypa.io/ez_setup.py -O - | python3
```
* 如果出現 `mysql_config not found` [issue](https://github.com/JudgeGirl/Judge-sender/issues/4)   
```
apt-get install libmysqlclient-dev
```

由於是遠端遙控，目前採用 ssh 遠端登入，要使用不需要密碼的方式登入遠端，假設從 `root@a.a.a.a` 登入到遠端的 `butler@b.b.b.b` 上 (意即用 root 身分執行 `./Judge-sender/start` 運行)

```
root@a.a.a.a $ ssh-keygen -t rsa
root@a.a.a.a $ scp ~/.ssh/id_rsa.pub butler@b.b.b.b:~/.ssh/
root@a.a.a.a $ ssh butler@b.b.b.b
butler@b.b.b.b $ cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

### Judge-receiver ###

若使用同一台電腦，將剛剛安裝的 Judge-receiver 下的檔案編譯後，丟到 butler 的家目錄，並且確定檔案權限。

```
$ make -C /home/judgesister/Judge-receiver/slave/ clean
$ make -C /home/judgesister/Judge-receiver/slave/
$ cp -r /home/judgesister/Judge-receiver/slave/* /home/butler
$ chown butler:butler /home/butler/butler
$ chown butler:butler /home/butler/tiger
$ chmod +s /home/butler/sandbox
$ chmod +x /home/butler/butler
```


例如要遠端連到 `butler@a.a.a.a`，在 butler 的家目錄配置如下，權限部份請特別小心 sandbox 的執行檔，必須 `chmod +s sandbox`。

```
root@supermicro:/home/butler# ls -l
total 832
-rwxr-xr-x 1 butler butler    770 Jan 23 16:06 butler
-rw-r--r-- 1 root   root      305 Jan 23 16:06 config.h
-rw-r--r-- 1 root   root      274 Jan 23 16:06 GNUmakefile
-rw-rw-r-- 1 root   root        5 Feb 18 00:00 log
-rwsr-sr-x 1 root   root    18457 Jan 23 16:06 sandbox
-rw-r--r-- 1 root   root     3281 Jan 23 16:06 sandbox.c
drwxr-xr-x 2 root   root     4096 Sep 12 19:06 script
-rw-r--r-- 1 root   root      106 Jan 23 16:06 test.c
-rwxr-xr-x 1 butler butler 795864 Jan 23 16:06 tiger
-rw-r--r-- 1 root   root      449 Jan 23 16:06 tiger.c
```

```
root@supermicro:/home/butler# tree
.
├── butler
├── config.h
├── GNUmakefile
├── log
├── sandbox
├── sandbox.c
├── script
│   ├── fstab
│   ├── mount
│   └── umount
├── test.c
├── tiger
└── tiger.c
```

編輯一下 `.bashrc` 的環境，等下遠端過來操作沙盒時，需要直接當作指令執行 butler 家目錄下編譯好的執行檔

```
root@supermicro:/home/butler# vim .bashrc
```

在 `.bashrc` 加入

```
export PATH=$HOME:$PATH
```

更新一下剛剛的設定

```
root@supermicro:/home/butler# source .bashrc
```

測試是否有成功，確定 `echo $PATH` 中出現 `/home/butler`。

```
root@supermicro:/home/butler# su butler
butler@supermicro:~$ echo $PATH
/home/butler:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
```


#### 準備沙盒 ####

* 確定 server 上有 `cgroup` 功能，在某些舊 kernel 並沒有我們需要限制沙盒的功能 (目前部分版本的 CentOS 和 Debian 沒有支持)。  
```
$ ls /sys/fs/cgroup/memory
```

確定 `memory.limit_in_bytes` 存在在清單中。(可以使用 `$ mount` 找到 `cgroup` 在哪個資料夾。)

* 在根目錄建造沙盒 `/sandbox`，資料夾架構如下：(特別注意到 `chmod +s sandbox` 的權限配置)  
```
root@supermicro:/# ls -l
total 104
drwsrwsrwx  13 root root  4096 Feb 25  2015 sandbox
```

* 建立 sandbox 資料夾目錄，執行 `./script/prepare` 會創建空的資料夾，接著執行 `./script/mount` (每一次主機重新開啟，都要重新跑這個 mount script 才行，否則測試結果會是一整排 Runtimer Error。) 將跟目錄下的這些資料夾 mount 到 sandbox 下。結果大致如下：  
```
root@supermicro:/sandbox# tree -L 2
sandbox/
├── bin
├── dev
├── etc
├── lib
├── lib64
├── opt
├── proc
├── sandbox/
|   ├── app
|   └── ws
├── sys
├── tmp
└── usr
```

* 確認 `sandbox/sandbox/app`、`sandbox/sandbox/ws` 的權限配置如下，uid 與 gid 皆為 butler。如果權限不對，執行 `$ chown butler:butler app ws` 解決此問題。  
```
root@supermicro:/sandbox/sandbox# ls -l
total 8
drwxr-xr-x 2 butler butler 4096 Feb 18 00:00 app
drwxrwxrwx 2 butler butler 4096 Feb 13 23:41 ws
```

##### 沙盒測試 #####

編譯簡單的 `hello.c`，複製到 `/sandbox` 下，並且限制時間 (second 為單位)、記憶體用量 (byte 為單位)，最後是執行的方式。如果上述測試沒有發生錯誤，順利印出 `Hello, World !` 表示沙盒部屬完成。否則可能是 mount 失敗、或者沒有順利建好資料夾。

```
root@ubuntu:/home/butler# gcc hello.c
root@ubuntu:/home/butler# cp a.out /sandbox/sandbox/app/
root@ubuntu:/home/butler# ./sandbox 1 16777216 ../app/a.out
```

### JudgeNode ###

#### 安裝 ####

1. 安裝 Nodejs & MySQL `apt-get install nodejs mysql-server`
2. 下載這一份 repository `git clone https://github.com/JudgeGirl/JudgeNode`
3. 複製設定檔案，並且產生 https 需要的相關文件  
```
$ cp _DEFAULTconfig.yml _config.yml
$ openssl genrsa -out privatekey.pem 1024
$ openssl req -new -key privatekey.pem -out certrequest.csr
$ openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
```
4. 確定 Judge 的目錄如下所示：  
```
root@ubuntu:/home/judgesister# tree -L 1
.
├── JudgeNode (可以放置別處)
├── Judge-sender (一定要與 source, submission, testdata 位置相當)
├── Judge-template (提供範例，可不用下載)
├── source
├── submission
└── testdata
```
5. 如果不手動建立，可以參考以下的做法建立
```
$ mkdir /home/judgesister/source
$ mkdir /home/judgesister/submission
$ mkdir /home/judgesister/testdata
$ cp -r /home/judgesister/Judge-template/default/source/* /home/judgesister/source/
```
6. 安裝 JudgeNode 相關套件  
```
$ cd JudgeNode
$ npm install
$ bower install
$ gulp build
```
7. 測試用的啟動模式 `npm start` / 公開用的啟動模式 `./start`

#### 關於設定檔 ####

在 `_config.yml` 中，預設檔案配置如下：

```
# order is important, don't change or alternate, otherwise please change all testdata/xxx/judge
# lang: ['*', 'C', 'C++', 'C# 3.0', 'Python 3', 'Scala 2']
# compiler: [, 'g++ -std=c++98 -O2', 'mcs -langversion:3', 'python3', 'scalac -optimise'],
# WT: 0, CE: 1, OLE: 2, MLE: 3, RE: 4, TLE: 5, WA: 6, AC: 7, SAVING: 8, PE: -1,
JUDGE:
    path: 'c:/Users/morris821028/Desktop/github/'
    lang: ['*', 'C']
    compiler_arg: ['none', 'gcc -std=c99 -O2']
    result_message: ['Waiting', 'Compilation Error', 'Output Limit Exceeded', 'Memory Limit Exceeded', 'Runtime Error', 'Time Limit Exceeded', 'Wrong Answer', 'Accepted', 'Uploading...', 'Presentation Error']

# JUDGE_PATH/submission /testdata /source
# JUDGE_PATH: /home/c2014/judgesister/

# MODE: limits user open previous source code & submit problem which not in contest.
CONTEST:
    MODE: false
    SUBMIT_LIMIT: 15
    VALID_IP: ["::ffff:140.112.16.155", "::ffff:140.112.16.156", "::ffff:140.112.16.158", "::1", "::ffff:127.0.0.1"]

# DATABASE Setting, MySQL
DATABASE:
    host: '140.112.xxx.xxx'
    user: 'xxxxxxxxxxxxxxx'
    password: 'xxxxxxxxxxx'
    port: '3306'
    database: 'xxxxxxxxxxxxx'

# WEBSITE API HOST
HOST:
    TITLE: 'Judge Girl'
    IP: 'localhost'
    testdata: 'https://github.com/JudgeGirl/JG-testdata/blob/master/practice/'
    social:
        youtube: 'https://www.youtube.com/playlist?list=PLOvZ8aEg7xDkpKHk3hAwQxLAlpZ1Q3wKH'
        github: 'https://github.com/pangfengliu/programmingtasks/issues'
        facebook: 'https://www.facebook.com/%E6%89%B9%E6%94%B9%E5%A8%98%E7%B2%89%E7%B5%B2%E5%9C%98-257246016760/timeline/'
        googlesite: 'https://sites.google.com/site/ntucsiec2015/announcement'
    footer:
        text: 'TA 曹又霖、顏志軒、林蔚城、陳威甯'
        license: 'Instructor <a title="劉邦鋒" href="/">Pangfeng Liu</a>, Web designer <a title="許祐程" href="/">Akira</a>, <a title="王盛平" href="/">Peer4321</a>, <a title="曹又霖" href="https://github.com/sinmaplewing">Maplewing</a>, <a title="楊翔雲" href="https://github.com/morris821028">Morris</a>'
# Disqus
Disqus:
    shortname: 'ntucsiecprogramming'
```

#### 公開用的啟動模式 ####

網站可能會因為某些 Bug 而掛掉，若需要不斷地重新開啟，執行目錄下的 `./start` 可以每隔 10 秒嘗試重新啟動，如果要強制關閉，請按 `CTRL + C` 終止網站啟動。在這種模式下，Debug 工作會變得非常困難。

```
$ ./start
```

* 如果 `CTRL + C` 沒有反應，按照下面步驟。  
```
$ root@ubuntu:/home/judgesister/JudgeNode# ps aux | grep start
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root      5671  0.0  0.0   4448   780 pts/3    S+   Feb20   0:00 /bin/sh ./start <<<<Judge-sender
root     19296  0.0  0.0  27236  8028 pts/4    S+   12:04   0:00 python3 ./start <<<<JudgeNode
$ kill -9 <JudgeNode-PID>
```

## 第一道題目 ##


```
$ mysql -u root -p
mysql >> use judgegirl
mysql >> INSERT INTO levels (level, ttl, lorder) VALUES (1, 'Test', 1);
mysql >> INSERT INTO level_domain (did, level) VALUES (0, 1);
```

